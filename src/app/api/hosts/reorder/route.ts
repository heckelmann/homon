import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { hosts } = body; // Expecting array of { id: number, orderIndex: number }

    if (!Array.isArray(hosts)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Update all hosts in a transaction
    await prisma.$transaction(
      hosts.map((host: { id: number; orderIndex: number }) =>
        prisma.host.update({
          where: { id: host.id },
          data: { orderIndex: host.orderIndex },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering hosts:', error);
    return NextResponse.json({ error: 'Failed to reorder hosts' }, { status: 500 });
  }
}
