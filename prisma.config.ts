import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.WOLFFS_DATABASE_URL ?? "file:./prisma/local.db",
  },
});
