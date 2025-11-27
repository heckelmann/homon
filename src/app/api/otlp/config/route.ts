import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await prisma.otlpConfig.findFirst();
    return NextResponse.json(config || { enabled: false, endpoint: '', headers: '{}' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { enabled, endpoint, headers } = body;

    const existing = await prisma.otlpConfig.findFirst();

    if (existing) {
      await prisma.otlpConfig.update({
        where: { id: existing.id },
        data: { enabled, endpoint, headers },
      });
    } else {
      await prisma.otlpConfig.create({
        data: { enabled, endpoint, headers },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving OTLP config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
