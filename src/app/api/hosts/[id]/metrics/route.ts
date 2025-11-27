import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSystemMetrics } from '@/lib/ssh';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  const password = host.credential?.password || host.password;
  const privateKey = host.credential?.privateKey || host.privateKey;

  if (!username) {
    return NextResponse.json({ error: 'No username configured' }, { status: 400 });
  }

  try {
    const metrics = await getSystemMetrics(
      host.hostname,
      host.port,
      username,
      password || undefined,
      privateKey || undefined
    );
    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('SSH Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
