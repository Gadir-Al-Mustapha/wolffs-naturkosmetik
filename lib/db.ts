import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

const globalDatabase = globalThis as typeof globalThis & { inventoryDb?: PrismaClient };

export const db = globalDatabase.inventoryDb ?? new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.WOLFFS_DATABASE_URL ?? "file:./prisma/local.db" }),
});

if (process.env.NODE_ENV !== "production") globalDatabase.inventoryDb = db;
