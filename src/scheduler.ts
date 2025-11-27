import { prisma } from './lib/prisma';
import { getSystemMetrics } from './lib/ssh';
import { exportMetricsToOtlp } from './lib/otlp';

const POLL_INTERVAL = 10000; // Check every 10 seconds
const PRUNE_INTERVAL = 60 * 60 * 1000; // Prune every hour

async function pruneMetrics() {
  console.log('Pruning old metrics...');
  try {
    const hosts = await prisma.host.findMany();
    for (const host of hosts) {
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - host.retentionDays);
      
      const { count } = await prisma.metric.deleteMany({
        where: {
          hostId: host.id,
          createdAt: {
            lt: retentionDate,
          },
        },
      });
      
      if (count > 0) {
        console.log(`Pruned ${count} metrics for ${host.label} (older than ${host.retentionDays} days)`);
      }
    }
  } catch (error) {
    console.error('Error pruning metrics:', error);
  }
}

async function collectMetrics() {
  console.log('Starting metrics collection...');
  
  try {
    const hosts = await prisma.host.findMany({
      include: {
        credential: true,
      },
    });
    
    for (const host of hosts) {
      // Simple check: In a real app, we'd track last update time per host
      // For now, we'll just collect for everyone on every run if the script runs often enough
      // Or better: check if we have a metric within the last (refreshInterval - buffer) seconds
      
      const lastMetric = await prisma.metric.findFirst({
        where: { hostId: host.id },
        orderBy: { createdAt: 'desc' },
      });

      const shouldUpdate = !lastMetric || 
        (new Date().getTime() - lastMetric.createdAt.getTime()) >= (host.refreshInterval * 1000);

      if (shouldUpdate) {
        console.log(`Collecting metrics for ${host.label} (${host.hostname})...`);
        try {
          const username = host.credential?.username || host.username;
          const password = host.credential?.password || host.password;
          const privateKey = host.credential?.privateKey || host.privateKey;

          if (!username) {
            throw new Error('No username configured');
          }

          const metrics = await getSystemMetrics(
            host.hostname,
            host.port,
            username,
            password || undefined,
            privateKey || undefined
          );

          await prisma.metric.create({
            data: {
              hostId: host.id,
              cpuUsage: metrics.cpuUsage,
              memoryUsed: metrics.memoryUsage.used,
              memoryTotal: metrics.memoryUsage.total,
              diskPercent: parseFloat(metrics.diskUsage.percent.replace('%', '')),
              diskUsage: JSON.stringify(metrics.disks),
            },
          });
          console.log(`Saved metrics for ${host.label}`);

          // Export to OTLP
          await exportMetricsToOtlp(host, metrics);

        } catch (error: any) {
          console.error(`Failed to collect metrics for ${host.label}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('Error in collection loop:', error);
  }
}

// Run immediately then loop
collectMetrics();
pruneMetrics();
setInterval(collectMetrics, POLL_INTERVAL);
setInterval(pruneMetrics, PRUNE_INTERVAL);

console.log(`Scheduler started. Polling every ${POLL_INTERVAL}ms...`);
