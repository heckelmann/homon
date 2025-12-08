import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Host } from '@prisma/client';
import { encrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hosts = await prisma.host.findMany();
  // Remove sensitive data before sending to client
  const safeHosts = hosts.map((host: Host) => ({
    ...host,
    password: host.password ? '********' : null,
    privateKey: host.privateKey ? '********' : null,
  }));
  return NextResponse.json(safeHosts);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { label, hostname, port, username, password, privateKey, credentialId, refreshInterval, retentionDays } = body;

  const host = await prisma.host.create({
    data: {
      label,
      hostname,
      port: parseInt(port),
      username: username || null,
      password: encrypt(password) || null,
      privateKey: encrypt(privateKey) || null,
      credentialId: credentialId ? parseInt(credentialId) : null,
      refreshInterval: parseInt(refreshInterval) || 60,
      retentionDays: parseInt(retentionDays) || 30,
    },
  });

  return NextResponse.json(host);
}
