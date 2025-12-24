import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scanPorts } from '@/lib/network';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ip: string }> }
) {
  const { ip } = await params;

  try {
    const ports = await scanPorts(ip);
    
    await prisma.discoveredDevice.update({
      where: { ip },
      data: {
        openPorts: JSON.stringify(ports),
      },
    });

    return NextResponse.json({ ports });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
