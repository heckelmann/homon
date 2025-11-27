import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createDirectory } from '@/lib/ssh';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { path } = body;

  if (!path) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 });
  }

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
    await createDirectory(
      host.hostname,
      host.port,
      username,
      path,
      password || undefined,
      privateKey || undefined
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('SSH Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
