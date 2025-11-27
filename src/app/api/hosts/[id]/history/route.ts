import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '1h';

  let since = new Date();
  switch (range) {
    case '1h':
      since.setHours(since.getHours() - 1);
      break;
    case '6h':
      since.setHours(since.getHours() - 6);
      break;
    case '24h':
      since.setHours(since.getHours() - 24);
      break;
    case '7d':
      since.setDate(since.getDate() - 7);
      break;
    default:
      since.setHours(since.getHours() - 1);
  }

  const metrics = await prisma.metric.findMany({
    where: {
      hostId: parseInt(id),
      createdAt: {
        gte: since,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      cpuUsage: true,
      memoryUsed: true,
      memoryTotal: true,
      diskPercent: true,
      diskUsage: true,
      createdAt: true,
    },
  });

  return NextResponse.json(metrics);
}
