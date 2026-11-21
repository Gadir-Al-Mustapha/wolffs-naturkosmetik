-- CreateTable
CREATE TABLE "MonthlyBox" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "inviteToken" TEXT NOT NULL,
    "managementToken" TEXT NOT NULL,
    "priceCent" INTEGER NOT NULL,
    "activatedAt" DATETIME,
    CONSTRAINT "MonthlyBox_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyBoxPause" (
    "boxId" INTEGER NOT NULL,
    "startMonth" INTEGER NOT NULL,
    "endMonth" INTEGER NOT NULL,
    "resumedAt" DATETIME,
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    CONSTRAINT "MonthlyBoxPause_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "MonthlyBox" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_MonthlyBoxToProduct" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_MonthlyBoxToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "MonthlyBox" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_MonthlyBoxToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyBox_inviteToken_key" ON "MonthlyBox"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyBox_managementToken_key" ON "MonthlyBox"("managementToken");

-- CreateIndex
CREATE INDEX "MonthlyBoxPause_boxId_startMonth_idx" ON "MonthlyBoxPause"("boxId", "startMonth");

-- CreateIndex
CREATE UNIQUE INDEX "_MonthlyBoxToProduct_AB_unique" ON "_MonthlyBoxToProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_MonthlyBoxToProduct_B_index" ON "_MonthlyBoxToProduct"("B");
