-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "standardPriceCent" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isAllergen" BOOLEAN NOT NULL,
    "note" TEXT
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "manufacturedOn" TEXT NOT NULL,
    "bestBefore" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "Batch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BatchIngredient" (
    "batchId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isAllergen" BOOLEAN NOT NULL,
    "note" TEXT,

    PRIMARY KEY ("batchId", "ingredientId"),
    CONSTRAINT "BatchIngredient_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BatchIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_BaseRecipe" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_BaseRecipe_A_fkey" FOREIGN KEY ("A") REFERENCES "Ingredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_BaseRecipe_B_fkey" FOREIGN KEY ("B") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- CreateIndex
CREATE INDEX "Batch_productId_bestBefore_idx" ON "Batch"("productId", "bestBefore");

-- CreateIndex
CREATE UNIQUE INDEX "_BaseRecipe_AB_unique" ON "_BaseRecipe"("A", "B");

-- CreateIndex
CREATE INDEX "_BaseRecipe_B_index" ON "_BaseRecipe"("B");
