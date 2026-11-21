-- AlterTable
ALTER TABLE "PrivateOrder" ADD COLUMN "bicycleStartedAt" DATETIME;
ALTER TABLE "PrivateOrder" ADD COLUMN "handedOffAt" DATETIME;
ALTER TABLE "PrivateOrder" ADD COLUMN "labelReadyAt" DATETIME;
ALTER TABLE "PrivateOrder" ADD COLUMN "packedAt" DATETIME;
ALTER TABLE "PrivateOrder" ADD COLUMN "pickupOn" TEXT;
ALTER TABLE "PrivateOrder" ADD COLUMN "trackingNumber" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payment" (
    "orderId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dueOn" TEXT,
    "paidAt" DATETIME,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PrivateOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("dueOn", "method", "orderId", "status") SELECT "dueOn", "method", "orderId", "status" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
