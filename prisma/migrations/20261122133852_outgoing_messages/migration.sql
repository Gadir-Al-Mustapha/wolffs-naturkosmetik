-- CreateTable
CREATE TABLE "OutgoingMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "gateway" TEXT,
    "recipient" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorCode" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttempt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutgoingMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PrivateOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OutgoingMessage_status_nextAttempt_idx" ON "OutgoingMessage"("status", "nextAttempt");

-- CreateIndex
CREATE UNIQUE INDEX "OutgoingMessage_orderId_kind_key" ON "OutgoingMessage"("orderId", "kind");
