import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDockerLogs } from '@/lib/ssh';
import { decrypt } from '@/lib/encryption';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; containerId: string }> }
) {
  const { id, containerId } = await params;
  const { searchParams } = new URL(request.url);
  const tail = parseInt(searchParams.get('tail') || '100');

  const host = await prisma.host.findUnique({
    where: {
      id: parseInt(id),
    },
    include: {
      credential: true,
    },
  });

  if (!host) {
    return NextResponse.json({ error: 'Host not found' }, { status: 404 });
  }

  const username = host.credential?.username || host.username;
  const password = decrypt(host.credential?.password || host.password);
  const privateKey = decrypt(host.credential?.privateKey || host.privateKey);

  if (!username) {
    return NextResponse.json({ error: 'No username configured' }, { status: 400 });
  }

  try {
    const logs = await getDockerLogs(
      host.hostname,
      host.port,
      username,
      containerId,
      tail,
      password || undefined,
      privateKey || undefined
    );
    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('SSH Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
