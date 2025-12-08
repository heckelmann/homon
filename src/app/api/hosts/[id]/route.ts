import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.host.delete({
    where: {
      id: parseInt(id),
    },
  });

  return NextResponse.json({ success: true });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const data: any = {
    label: body.label,
    hostname: body.hostname,
    port: body.port,
    username: body.username || null,
    credentialId: body.credentialId ? parseInt(body.credentialId) : null,
    refreshInterval: body.refreshInterval,
    retentionDays: body.retentionDays,
  };

  if (body.password !== '********') {
    data.password = body.password ? encrypt(body.password) : null;
  }

  if (body.privateKey !== '********') {
    data.privateKey = body.privateKey ? encrypt(body.privateKey) : null;
  }

  const host = await prisma.host.update({
    where: {
      id: parseInt(id),
    },
    data,
  });

  return NextResponse.json(host);
}
