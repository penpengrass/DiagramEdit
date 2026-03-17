import express from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const app = express();
const PORT = process.env.PORT || 3000;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL || "" }),
}) as any;

// ルートパスへのリクエスト
app.get("/", (req:any, res:any) => {
  res.send("Server is running");
});

// リッスンするポートの設定
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});