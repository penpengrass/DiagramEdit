import express from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { importStations } from "./importStations.js";
import 'dotenv/config'

const app = express();
const PORT = process.env.PORT || 3000;

// 環境変数デバッグ出力
console.log("🔍 DATABASE_URL:", process.env.DATABASE_URL ? "✅ Set" : "❌ Not set");
console.log("🔍 NODE_ENV:", process.env.NODE_ENV || "development");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL || "" }),
}) as any;

// ミドルウェア設定
app.use(express.json());

// ルートパスへのリクエスト
app.get("/", (req: any, res: any) => {
  res.send("Server is running");
});

// テスト用シンプルエンドポイント
app.get("/test", (req: any, res: any) => {
  res.json({ message: "Test endpoint works!", timestamp: new Date().toISOString() });
});

// DB接続確認エンドポイント
app.get("/api/health", async (req: any, res: any) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: "✅ Database connected successfully",
      database: process.env.DATABASE_URL?.split('/').pop()?.split('?')[0] 
    });
  } catch (err: any) {
    console.error("❌ Health check error:", err);
    res.status(500).json({ 
      status: "❌ Database connection failed", 
      error: err.message,
      code: err.code,
      detail: err.detail,
      hint: "Check PostgreSQL is running and credentials are correct"
    });
  }
});

// サーバー起動時にDB接続を確認
async function startServer() {
  try {
    console.log("⏳ Testing database connection...");
    
    // タイムアウト付きでDB接続テスト
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database connection timeout (5s)")), 5000)
    );
    
    const queryPromise = prisma.$queryRaw`SELECT 1`;
    await Promise.race([queryPromise, timeoutPromise]);
    
    console.log("✅ Database connection verified");
    
    // stations.json をインポート
    await importStations(prisma);

    // サーバーをリッスン開始
    app.listen(PORT, () => {
      console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err: any) {
    console.error("❌ Failed to connect to database:", err.message);
    console.error("💡 Check that:");
    console.error("   1. PostgreSQL is running");
    console.error("   2. DATABASE_URL is correct in prisma/.env");
    console.error("   3. Database 'unyo_sample' exists");
    process.exit(1);
  }
}

// サーバー起動
startServer();

// Gracefulシャットダウン
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down server...");
  await prisma.$disconnect();
  process.exit(0);
});