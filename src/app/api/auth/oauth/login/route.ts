import { NextRequest, NextResponse } from 'next/server';
import { getOAuthConfig, getOIDCDiscovery, getAppOrigin } from '@/lib/oidc';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const config = await getOAuthConfig();
    if (!config || !config.enabled) {
      return NextResponse.json({ error: 'OAuth not enabled' }, { status: 400 });
    }

    const discovery = await getOIDCDiscovery(config.issuer);
    const authorizationEndpoint = discovery.authorization_endpoint;

    const state = randomBytes(16).toString('hex');
    const origin = getAppOrigin(request);
    const redirectUri = `${origin}/api/auth/oauth/callback`;

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scope,
      state: state,
    });

    const url = `${authorizationEndpoint}?${params.toString()}`;

    const response = NextResponse.redirect(url);
    response.cookies.set('oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 300 });
    
    return response;
  } catch (error: any) {
    console.error('OAuth login error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
