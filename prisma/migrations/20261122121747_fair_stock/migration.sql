-- CreateTable
CREATE TABLE "Fair" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "eventDate" TEXT NOT NULL,
    "dispatchedAt" DATETIME,
    "closedAt" DATETIME
);

-- CreateTable
CREATE TABLE "FairRequest" (
    "fairId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    PRIMARY KEY ("fairId", "productId"),
    CONSTRAINT "FairRequest_fairId_fkey" FOREIGN KEY ("fairId") REFERENCES "Fair" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FairRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FairStock" (
    "fairId" INTEGER NOT NULL,
    "batchId" INTEGER NOT NULL,
    "taken" INTEGER NOT NULL,
    "returned" INTEGER,

    PRIMARY KEY ("fairId", "batchId"),
    CONSTRAINT "FairStock_fairId_fkey" FOREIGN KEY ("fairId") REFERENCES "Fair" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FairStock_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
