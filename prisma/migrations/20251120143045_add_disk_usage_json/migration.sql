-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Metric" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hostId" INTEGER NOT NULL,
    "cpuUsage" REAL NOT NULL,
    "memoryUsed" INTEGER NOT NULL,
    "memoryTotal" INTEGER NOT NULL,
    "diskPercent" REAL NOT NULL,
    "diskUsage" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Metric_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Metric" ("cpuUsage", "createdAt", "diskPercent", "hostId", "id", "memoryTotal", "memoryUsed") SELECT "cpuUsage", "createdAt", "diskPercent", "hostId", "id", "memoryTotal", "memoryUsed" FROM "Metric";
DROP TABLE "Metric";
ALTER TABLE "new_Metric" RENAME TO "Metric";
CREATE INDEX "Metric_hostId_createdAt_idx" ON "Metric"("hostId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
