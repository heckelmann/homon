-- CreateTable
CREATE TABLE "DiscoveredDevice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ip" TEXT NOT NULL,
    "mac" TEXT,
    "hostname" TEXT,
    "vendor" TEXT,
    "status" TEXT NOT NULL,
    "lastSeen" DATETIME NOT NULL,
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openPorts" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveredDevice_ip_key" ON "DiscoveredDevice"("ip");
