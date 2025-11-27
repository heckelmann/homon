"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/lib/ssh.ts
var getSystemMetrics = async (host, port, username, password, privateKey) => {
  const { Client } = await import("ssh2");
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on("ready", () => {
      const cmd = `
        top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}' && echo "---SPLIT---" &&
        free -m | grep Mem | awk '{print $2 " " $3 " " $4}' && echo "---SPLIT---" &&
        df -h / | tail -1 | awk '{print $2 " " $3 " " $4 " " $5}' && echo "---SPLIT---" &&
        df -h | grep -vE '^Filesystem|tmpfs|cdrom|udev|none'
      `;
      conn.exec(cmd, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        let output = "";
        stream.on("close", (code, signal) => {
          conn.end();
          try {
            const parts = output.trim().split("---SPLIT---");
            if (parts.length < 4) {
              return reject(new Error("Unexpected output format from server"));
            }
            const cpuUsage = parseFloat(parts[0].trim());
            const [memTotal, memUsed, memFree] = parts[1].trim().split(" ").map(Number);
            const [diskTotal, diskUsed, diskFree, diskPercent] = parts[2].trim().split(" ");
            const diskLines = parts[3].trim().split("\n");
            const disks = diskLines.map((line) => {
              const [filesystem, size, used, available, usePercent, mount] = line.split(/\s+/);
              return { filesystem, size, used, available, usePercent, mount };
            }).filter((d) => d.filesystem && d.mount);
            resolve({
              cpuUsage,
              memoryUsage: {
                total: memTotal,
                used: memUsed,
                free: memFree
              },
              diskUsage: {
                total: diskTotal,
                used: diskUsed,
                free: diskFree,
                percent: diskPercent
              },
              disks
            });
          } catch (e) {
            reject(e);
          }
        }).on("data", (data) => {
          output += data;
        }).stderr.on("data", (data) => {
        });
      });
    }).on("error", (err) => {
      reject(err);
    }).connect({
      host,
      port,
      username,
      password,
      privateKey,
      readyTimeout: 2e4
      // Increase timeout
    });
  });
};

// src/scheduler.ts
var POLL_INTERVAL = 1e4;
async function collectMetrics() {
  console.log("Starting metrics collection...");
  try {
    const hosts = await prisma.host.findMany();
    for (const host of hosts) {
      const lastMetric = await prisma.metric.findFirst({
        where: { hostId: host.id },
        orderBy: { createdAt: "desc" }
      });
      const shouldUpdate = !lastMetric || (/* @__PURE__ */ new Date()).getTime() - lastMetric.createdAt.getTime() >= host.refreshInterval * 1e3;
      if (shouldUpdate) {
        console.log(`Collecting metrics for ${host.label} (${host.hostname})...`);
        try {
          const metrics = await getSystemMetrics(
            host.hostname,
            host.port,
            host.username,
            host.password || void 0,
            host.privateKey || void 0
          );
          await prisma.metric.create({
            data: {
              hostId: host.id,
              cpuUsage: metrics.cpuUsage,
              memoryUsed: metrics.memoryUsage.used,
              memoryTotal: metrics.memoryUsage.total,
              diskPercent: parseFloat(metrics.diskUsage.percent.replace("%", "")),
              diskUsage: JSON.stringify(metrics.disks)
            }
          });
          console.log(`Saved metrics for ${host.label}`);
        } catch (error) {
          console.error(`Failed to collect metrics for ${host.label}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error("Error in collection loop:", error);
  }
}
collectMetrics();
setInterval(collectMetrics, POLL_INTERVAL);
console.log(`Scheduler started. Polling every ${POLL_INTERVAL}ms...`);
