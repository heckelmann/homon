import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

  const host = await prisma.host.update({
    where: {
      id: parseInt(id),
    },
    data: {
      label: body.label,
      hostname: body.hostname,
      port: body.port,
      username: body.username || null,
      password: body.password || null,
      privateKey: body.privateKey || null,
      credentialId: body.credentialId ? parseInt(body.credentialId) : null,
      refreshInterval: body.refreshInterval,
      retentionDays: body.retentionDays,
    },
  });

  return NextResponse.json(host);
}
