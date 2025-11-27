import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFileContent, saveFileContent } from '@/lib/ssh';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

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
    const content = await getFileContent(
      host.hostname,
      host.port,
      username,
      path,
      password || undefined,
      privateKey || undefined
    );
    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('SSH Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { path, content } = body;

  if (!path || content === undefined) {
    return NextResponse.json({ error: 'Path and content are required' }, { status: 400 });
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
    await saveFileContent(
      host.hostname,
      host.port,
      username,
      path,
      content,
      password || undefined,
      privateKey || undefined
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('SSH Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
