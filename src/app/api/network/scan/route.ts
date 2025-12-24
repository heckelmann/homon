import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scanNetworkStream, getLocalNetwork } from '@/lib/network';
import { DiscoveredDevice } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const devices = await prisma.discoveredDevice.findMany({
    orderBy: { ip: 'asc' },
  });
  
  // Check if any devices are monitored
  const hosts = await prisma.host.findMany({
    select: { hostname: true, id: true }
  });
  
  const hostMap = new Set(hosts.map(h => h.hostname)); // Assuming hostname in Host is IP or resolvable name. 
  // Actually, Host.hostname is the address.
  
  const devicesWithStatus = devices.map(d => ({
    ...d,
    isMonitored: hostMap.has(d.ip)
  }));

  return NextResponse.json({
    devices: devicesWithStatus,
    defaultRange: getLocalNetwork() || '192.168.1.0/24'
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { range, scanPorts } = body;

    if (!range) {
      return NextResponse.json({ error: 'Range is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const scanTime = new Date();
          for await (const event of scanNetworkStream(range, scanPorts)) {
            if (event.type === 'device') {
               const result = event.device;
               await prisma.discoveredDevice.upsert({
                where: { ip: result.ip },
                update: {
                  status: 'online',
                  lastSeen: scanTime,
                  hostname: result.hostname,
                  ...(result.openPorts ? { openPorts: JSON.stringify(result.openPorts) } : {}),
                },
                create: {
                  ip: result.ip,
                  status: 'online',
                  lastSeen: scanTime,
                  firstSeen: scanTime,
                  hostname: result.hostname,
                  openPorts: result.openPorts ? JSON.stringify(result.openPorts) : null,
                },
              });
            }
            controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.discoveredDevice.deleteMany();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
