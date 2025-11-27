import { prisma } from './prisma';
import { NextRequest } from 'next/server';

export async function getOAuthConfig() {
  return await prisma.oAuthConfig.findFirst();
}

export function getAppOrigin(request: NextRequest) {
  const appUrl = process.env.APP_URL;
  if (appUrl) {
    console.log('Using APP_URL:', appUrl);
    return appUrl.replace(/\/$/, '');
  }
  
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  
  console.log('Detected origin from headers:', { host, proto, appUrl: process.env.APP_URL });

  if (host) {
    return `${proto}://${host}`;
  }
  
  return request.nextUrl.origin;
}

export async function getOIDCDiscovery(issuer: string) {
  // Remove trailing slash if present
  const cleanIssuer = issuer.replace(/\/$/, '');
  const res = await fetch(`${cleanIssuer}/.well-known/openid-configuration`);
  if (!res.ok) throw new Error('Failed to fetch OIDC configuration');
  return await res.json();
}
