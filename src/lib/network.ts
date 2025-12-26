import os from 'os';
import dns from 'dns/promises';
import { exec } from 'child_process';
import util from 'util';
import dgram from 'dgram';
// @ts-ignore
import Evilscan from 'evilscan';

const execAsync = util.promisify(exec);

export interface ScanResult {
  ip: string;
  port?: number;
  status?: string;
  mac?: string;
  vendor?: string;
  hostname?: string;
  openPorts?: number[];
}

export type ScanEvent = 
  | { type: 'device'; device: ScanResult }
  | { type: 'progress'; currentIp: string; percent: number };

async function getArpTable(): Promise<Map<string, { mac: string, hostname?: string }>> {
  const map = new Map();
  try {
    const { stdout } = await execAsync('arp -a');
    const lines = stdout.split('\n');
    for (const line of lines) {
      // macOS/BSD: ? (192.168.1.1) at 11:22:33:44:55:66 on en0 ...
      // Linux: ? (192.168.1.1) at 11:22:33:44:55:66 [ether] on eth0
      const match = line.match(/\(([\d\.]+)\) at ([0-9a-fA-F:]+)/);
      if (match) {
        const ip = match[1];
        const mac = match[2];
        const hostMatch = line.match(/^(\S+)\s+\(/);
        const hostname = (hostMatch && hostMatch[1] !== '?') ? hostMatch[1] : undefined;
        map.set(ip, { mac, hostname });
      }
    }
  } catch (e) {
    console.error('ARP error', e);
  }
  return map;
}

function resolveNetbios(ip: string): Promise<string | null> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');
    const msg = Buffer.from([
      0x13, 0x37, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x20, 0x43, 0x4b, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
      0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
      0x00, 0x00, 0x21, 0x00, 0x01
    ]);

    socket.on('message', (msg) => {
      try {
        const numNames = msg[56];
        if (numNames > 0) {
           let offset = 57;
           for(let i=0; i<numNames; i++) {
             const name = msg.slice(offset, offset + 15).toString().trim();
             const type = msg[offset + 15];
             if (type === 0x00 || type === 0x20) {
                // Filter out garbage
                if (/^[a-zA-Z0-9-]+$/.test(name)) {
                    socket.close();
                    resolve(name);
                    return;
                }
             }
             offset += 18;
           }
        }
      } catch (e) {}
      try { socket.close(); } catch {}
      resolve(null);
    });

    socket.on('error', () => {
      try { socket.close(); } catch {}
      resolve(null);
    });

    socket.send(msg, 137, ip, (err) => {
      if (err) {
        try { socket.close(); } catch {}
        resolve(null);
      }
    });

    setTimeout(() => {
      try { socket.close(); } catch {}
      resolve(null);
    }, 500);
  });
}

export function getLocalNetwork(): string | null {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      // Skip internal and non-IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        // Calculate CIDR based on netmask
        // Simple approximation: assume /24 if 255.255.255.0
        const parts = iface.address.split('.');
        return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
      }
    }
  }
  return null;
}

// Helper to convert IP to long
function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

// Helper to convert long to IP
function longToIp(long: number): string {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255
  ].join('.');
}

// Helper to parse CIDR
function parseCidr(cidr: string) {
  try {
    const [ip, maskStr] = cidr.split('/');
    const mask = parseInt(maskStr, 10);
    const ipLong = ipToLong(ip);
    const maskLong = -1 << (32 - mask);
    const start = (ipLong & maskLong) >>> 0;
    const end = (start | ~maskLong) >>> 0;
    return { start, end, total: end - start + 1 };
  } catch (e) {
    return { start: 0, end: 0, total: 0 };
  }
}

function scanRange(range: string): Promise<ScanResult[]> {
  return new Promise((resolve, reject) => {
    const options = {
      target: range,
      port: '22,80,443',
      status: 'O',
      banner: false,
      concurrency: 50,
      timeout: 1000,
    };

    const scanner = new Evilscan(options);
    const results: ScanResult[] = [];
    const seenIps = new Set<string>();

    scanner.on('result', (data: any) => {
      if (!seenIps.has(data.ip)) {
        seenIps.add(data.ip);
        results.push({
          ip: data.ip,
          status: 'online',
        });
      }
    });

    scanner.on('error', (err: any) => {
      console.warn('Scanner error:', err);
    });

    scanner.on('done', () => {
      resolve(results);
    });

    scanner.run();
  });
}

export async function* scanNetworkStream(range: string, withPorts: boolean = false): AsyncGenerator<ScanEvent> {
  const { start, end, total } = parseCidr(range);
  
  // Pre-fetch ARP table
  const arpTable = await getArpTable();
  
  if (total === 0) {
    const results = await scanRange(range);
    for (const result of results) {
       // 1. Try ARP cache
       const arpEntry = arpTable.get(result.ip);
       if (arpEntry) {
         result.mac = arpEntry.mac;
         if (arpEntry.hostname) result.hostname = arpEntry.hostname;
       }

       // 2. Try DNS Reverse
       if (!result.hostname) {
         try {
            const hostnames = await dns.reverse(result.ip);
            if (hostnames.length > 0) result.hostname = hostnames[0];
         } catch {}
       }

       // 3. Try NetBIOS
       if (!result.hostname) {
         const nbName = await resolveNetbios(result.ip);
         if (nbName) result.hostname = nbName;
       }
       
       if (withPorts) {
         try {
           const ports = await scanPorts(result.ip);
           result.openPorts = ports;
         } catch {}
       }

       yield { type: 'device', device: result } as ScanEvent;
    }
    yield { type: 'progress', currentIp: 'Done', percent: 100 } as ScanEvent;
    return;
  }

  const chunkSize = 10;
  let current = start;
  
  while (current <= end) {
    const chunkEnd = Math.min(current + chunkSize - 1, end);
    const chunkRange = `${longToIp(current)}-${longToIp(chunkEnd)}`;
    
    yield { 
      type: 'progress', 
      currentIp: longToIp(current), 
      percent: Math.round(((current - start) / total) * 100) 
    } as ScanEvent;

    try {
      const chunkResults = await scanRange(chunkRange);
      for (const result of chunkResults) {
        // 1. Try ARP cache
        const arpEntry = arpTable.get(result.ip);
        if (arpEntry) {
          result.mac = arpEntry.mac;
          if (arpEntry.hostname) result.hostname = arpEntry.hostname;
        }

        // 2. Try DNS Reverse
        if (!result.hostname) {
          try {
              const hostnames = await dns.reverse(result.ip);
              if (hostnames.length > 0) result.hostname = hostnames[0];
          } catch {}
        }

        // 3. Try NetBIOS
        if (!result.hostname) {
          const nbName = await resolveNetbios(result.ip);
          if (nbName) result.hostname = nbName;
        }

        if (withPorts) {
          try {
            const ports = await scanPorts(result.ip);
            result.openPorts = ports;
          } catch {}
        }
        
        yield { type: 'device', device: result } as ScanEvent;
      }
    } catch (e) {
      console.error(`Error scanning chunk ${chunkRange}`, e);
    }

    current += chunkSize;
  }
  
  yield { type: 'progress', currentIp: 'Done', percent: 100 } as ScanEvent;
}

export function scanNetwork(range: string): Promise<ScanResult[]> {
  return scanRange(range).then(async (results) => {
      const resultsWithHostnames = await Promise.all(results.map(async (result) => {
        try {
          const hostnames = await dns.reverse(result.ip);
          if (hostnames && hostnames.length > 0) {
            return { ...result, hostname: hostnames[0] };
          }
        } catch (e) {
        }
        return result;
      }));
      return resultsWithHostnames;
  });
}

export function scanPorts(ip: string): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const options = {
      target: ip,
      port: '21,22,23,25,53,80,110,111,135,139,143,443,445,993,995,1723,3306,3389,5900,8080',
      status: 'O',
      banner: false,
      timeout: 2000,
    };

    const scanner = new Evilscan(options);
    const ports: number[] = [];

    scanner.on('result', (data: any) => {
      if (data.status === 'open') {
        ports.push(data.port);
      }
    });

    scanner.on('error', (err: any) => {
      reject(err);
    });

    scanner.on('done', () => {
      resolve(ports);
    });

    scanner.run();
  });
}
