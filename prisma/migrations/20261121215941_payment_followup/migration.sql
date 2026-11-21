-- AlterTable
ALTER TABLE "PrivateOrder" ADD COLUMN "cancelledAt" DATETIME;

-- CreateTable
CREATE TABLE "TestPaymentReminder" (
    "orderId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestPaymentReminder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PrivateOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
