-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Host" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 22,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "privateKey" TEXT,
    "refreshInterval" INTEGER NOT NULL DEFAULT 60,
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Host" ("createdAt", "hostname", "id", "label", "orderIndex", "password", "port", "privateKey", "refreshInterval", "updatedAt", "username") SELECT "createdAt", "hostname", "id", "label", "orderIndex", "password", "port", "privateKey", "refreshInterval", "updatedAt", "username" FROM "Host";
DROP TABLE "Host";
ALTER TABLE "new_Host" RENAME TO "Host";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
