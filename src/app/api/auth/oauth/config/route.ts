import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const config = await prisma.oAuthConfig.findFirst();
    if (!config) {
      return NextResponse.json({ enabled: false });
    }
    return NextResponse.json({
      enabled: config.enabled,
      name: config.name,
      issuer: config.issuer,
      clientId: config.clientId,
      scope: config.scope,
      // Do not return clientSecret
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { enabled, name, issuer, clientId, clientSecret, scope } = body;

    const existing = await prisma.oAuthConfig.findFirst();

    if (existing) {
      await prisma.oAuthConfig.update({
        where: { id: existing.id },
        data: {
          enabled,
          name,
          issuer,
          clientId,
          clientSecret: clientSecret || existing.clientSecret, // Allow updating without re-sending secret if empty? Or just require it.
          scope,
        },
      });
    } else {
      await prisma.oAuthConfig.create({
        data: {
          enabled,
          name,
          issuer,
          clientId,
          clientSecret,
          scope,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OAuth config error:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
