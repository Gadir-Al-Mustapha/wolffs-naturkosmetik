-- CreateTable
CREATE TABLE "MonthlyBoxRun" (
    "boxId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "orderId" INTEGER,
    "failureReason" TEXT,
    "creditCent" INTEGER NOT NULL DEFAULT 0,
    "appliedCent" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("boxId", "month"),
    CONSTRAINT "MonthlyBoxRun_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "MonthlyBox" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MonthlyBoxRun_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PrivateOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyBoxRun_orderId_key" ON "MonthlyBoxRun"("orderId");
