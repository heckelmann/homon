import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const credentials = await prisma.credential.findMany({
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(credentials);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, username, password, privateKey } = body;

    if (!name || !username) {
      return NextResponse.json(
        { error: 'Name and username are required' },
        { status: 400 }
      );
    }

    const credential = await prisma.credential.create({
      data: {
        name,
        username,
        password,
        privateKey,
      },
    });

    return NextResponse.json(credential);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A credential with this name already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
