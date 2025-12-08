import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { name, username, password, privateKey } = body;

    const data: any = {
      name,
      username,
    };

    if (password !== '********') {
      data.password = password ? encrypt(password) : null;
    }

    if (privateKey !== '********') {
      data.privateKey = privateKey ? encrypt(privateKey) : null;
    }

    const credential = await prisma.credential.update({
      where: { id: parseInt(id) },
      data,
    });

    return NextResponse.json(credential);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.credential.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
