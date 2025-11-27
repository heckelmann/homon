import { NextRequest, NextResponse } from 'next/server';
import { getOAuthConfig, getOIDCDiscovery, getAppOrigin } from '@/lib/oidc';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const storedState = request.cookies.get('oauth_state')?.value;

    if (!code || !state || state !== storedState) {
      return NextResponse.redirect(new URL('/login?error=Invalid state', request.url));
    }

    const config = await getOAuthConfig();
    if (!config || !config.enabled) {
      return NextResponse.redirect(new URL('/login?error=OAuth disabled', request.url));
    }

    const discovery = await getOIDCDiscovery(config.issuer);
    const tokenEndpoint = discovery.token_endpoint;
    const userinfoEndpoint = discovery.userinfo_endpoint;
    
    const origin = getAppOrigin(request);
    const redirectUri = `${origin}/api/auth/oauth/callback`;

    // Exchange code for token
    const tokenRes = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('Token exchange failed:', text);
      return NextResponse.redirect(new URL('/login?error=Token exchange failed', request.url));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Get user info
    const userRes = await fetch(userinfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(new URL('/login?error=Failed to fetch user info', request.url));
    }

    const userInfo = await userRes.json();
    
    // Try to match user
    // We look for a user where username matches preferred_username, email, or name
    const username = userInfo.preferred_username || userInfo.email || userInfo.name || userInfo.sub;
    
    let user = await prisma.user.findFirst({
      where: {
        username: username
      }
    });

    if (!user) {
       // Try to find by email if username didn't match
       if (userInfo.email && userInfo.email !== username) {
         user = await prisma.user.findFirst({
            where: { username: userInfo.email }
         });
       }
    }

    if (!user) {
        return NextResponse.redirect(new URL(`/login?error=User not found: ${username}`, request.url));
    }

    // Create session
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session = await encrypt({ user: { id: user.id, username: user.username }, expires });

    const response = NextResponse.redirect(new URL('/', origin));
    response.cookies.set('session', session, { expires, httpOnly: true });
    response.cookies.delete('oauth_state');

    return response;

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
  }
}
