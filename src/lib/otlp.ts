import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { prisma } from './prisma';
import { SystemMetrics } from './ssh';
import { Host } from '@prisma/client';

export async function exportMetricsToOtlp(host: Host, metrics: SystemMetrics) {
  try {
    const config = await prisma.otlpConfig.findFirst();
    if (!config || !config.enabled) {
      return;
    }

    const headers = config.headers ? JSON.parse(config.headers) : {};

    const exporter = new OTLPMetricExporter({
      url: config.endpoint,
      headers: headers,
    });

    // Create a resource representing the host
    const resource = resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: 'homon-agent',
      [SemanticResourceAttributes.HOST_NAME]: host.hostname,
      [SemanticResourceAttributes.HOST_ID]: host.id.toString(),
      'host.label': host.label,
    });

    const metricReader = new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: 1000, // Short interval to force export quickly
    });

    const meterProvider = new MeterProvider({
      resource: resource,
      readers: [metricReader],
    });

    const meter = meterProvider.getMeter('homon-metrics');

    // CPU
    const cpuGauge = meter.createObservableGauge('system.cpu.utilization', {
      description: 'CPU Usage',
      unit: '1',
    });
    cpuGauge.addCallback((result) => {
      result.observe(metrics.cpuUsage / 100);
    });

    // Memory
    const memUsageGauge = meter.createObservableGauge('system.memory.usage', {
      description: 'Memory Usage',
      unit: 'By',
    });
    memUsageGauge.addCallback((result) => {
      result.observe(metrics.memoryUsage.used, { state: 'used' });
      result.observe(metrics.memoryUsage.free, { state: 'free' });
    });
    
    const memLimitGauge = meter.createObservableGauge('system.memory.limit', {
        description: 'Total Memory',
        unit: 'By',
    });
    memLimitGauge.addCallback((result) => {
        result.observe(metrics.memoryUsage.total);
    });

    // Disk
    const diskUsageGauge = meter.createObservableGauge('system.disk.usage', {
        description: 'Disk Usage',
        unit: 'By',
    });
    
    const diskLimitGauge = meter.createObservableGauge('system.disk.limit', {
        description: 'Disk Total Size',
        unit: 'By',
    });

    diskUsageGauge.addCallback((result) => {
        for (const disk of metrics.disks) {
            const usedBytes = parseBytes(disk.used);
            const totalBytes = parseBytes(disk.size);
            
            if (usedBytes !== null) {
                result.observe(usedBytes, { device: disk.filesystem, mountpoint: disk.mount, state: 'used' });
            }
        }
    });
    
    diskLimitGauge.addCallback((result) => {
         for (const disk of metrics.disks) {
            const totalBytes = parseBytes(disk.size);
            if (totalBytes !== null) {
                result.observe(totalBytes, { device: disk.filesystem, mountpoint: disk.mount });
            }
         }
    });

    await metricReader.forceFlush();
    
    // Cleanup
    await meterProvider.shutdown();

  } catch (error) {
    console.error('Error exporting metrics to OTLP:', error);
  }
}

function parseBytes(sizeStr: string): number | null {
    const units = {
        'K': 1024,
        'M': 1024 * 1024,
        'G': 1024 * 1024 * 1024,
        'T': 1024 * 1024 * 1024 * 1024,
        'P': 1024 * 1024 * 1024 * 1024 * 1024
    };
    
    const regex = /^([\d\.]+)([KMGTP]?)$/;
    const match = sizeStr.match(regex);
    
    if (!match) return null;
    
    const value = parseFloat(match[1]);
    const unit = match[2] as keyof typeof units;
    
    if (unit && units[unit]) {
        return value * units[unit];
    }
    return value; // Bytes or unknown
}

export async function verifyOtlpConnection(endpoint: string, headers: any): Promise<boolean> {
    try {
        // 1. Basic URL validation
        new URL(endpoint);

        // 2. Try to send a minimal OTLP payload via fetch
        // This is more reliable than the SDK's forceFlush which might suppress errors
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: JSON.stringify({
                resourceMetrics: []
            }),
            // Add a timeout to avoid hanging
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            console.error(`Verification failed with status: ${response.status} ${response.statusText}`);
            // If we get 4xx or 5xx, it's a failure (auth, bad request, server error)
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Verification failed:', error);
        return false;
    }
}
