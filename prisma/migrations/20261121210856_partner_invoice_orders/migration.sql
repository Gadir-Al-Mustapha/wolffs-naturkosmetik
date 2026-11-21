-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "partnerDiscountPercent" INTEGER;

-- CreateTable
CREATE TABLE "Payment" (
    "orderId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dueOn" TEXT NOT NULL,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PrivateOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PrivateOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    "delivery" TEXT NOT NULL,
    "loyal" BOOLEAN NOT NULL,
    "code" TEXT,
    "subtotal" INTEGER NOT NULL,
    "loyaltyDiscount" INTEGER NOT NULL,
    "promotionDiscount" INTEGER NOT NULL,
    "promotionExcluded" BOOLEAN NOT NULL DEFAULT false,
    "shipping" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "partnerDiscountPercent" INTEGER,
    "partnerPriceApplied" BOOLEAN NOT NULL DEFAULT false,
    "partnerExceptionReason" TEXT,
    CONSTRAINT "PrivateOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PrivateOrder" ("code", "confirmedAt", "createdAt", "customerId", "delivery", "id", "loyal", "loyaltyDiscount", "promotionDiscount", "promotionExcluded", "shipping", "subtotal", "token", "total") SELECT "code", "confirmedAt", "createdAt", "customerId", "delivery", "id", "loyal", "loyaltyDiscount", "promotionDiscount", "promotionExcluded", "shipping", "subtotal", "token", "total" FROM "PrivateOrder";
DROP TABLE "PrivateOrder";
ALTER TABLE "new_PrivateOrder" RENAME TO "PrivateOrder";
CREATE UNIQUE INDEX "PrivateOrder_token_key" ON "PrivateOrder"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
