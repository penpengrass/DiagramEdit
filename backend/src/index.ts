import 'dotenv/config';
import app from "./app.js";
import { initPrisma, disconnectPrisma } from "./config/database.js";
import { importStations } from './services/stationServices.js';

const PORT = process.env.PORT || 3000;

/**
 * 環境変数のログ出力
 */
function logEnvironment(): void {
  console.log("🔍 DATABASE_URL:", process.env.DATABASE_URL ? "✅ Set" : "❌ Not set");
  console.log("🔍 NODE_ENV:", process.env.NODE_ENV || "development");
  console.log("🔍 PORT:", PORT);
}

/**
 * サーバーの起動
 */
async function startServer(): Promise<void> {
  try {
    logEnvironment();
    
    console.log("⏳ Initializing Prisma...");
    const prisma = initPrisma();

    // DB初期化処理：DBが空の場合のみstations.jsonをインポート
    console.log("⏳ Checking database and initializing if needed...");
    await importStations(prisma); // 条件付きインポート（DBに既存データがあればスキップ）

    // サーバーをリッスン開始
    app.listen(PORT, () => {
      console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📊 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/test`);
    });
  } catch (err: any) {
    console.error("❌ Failed to start server:", err.message);
    console.error("💡 Check that:");
    console.error("   1. PostgreSQL is running");
    console.error("   2. DATABASE_URL is correct in .env");
    console.error("   3. Database exists");
    process.exit(1);
  }
}

/**
 * Graceful シャットダウン
 */
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down server...");
  await disconnectPrisma();
  process.exit(0);
});

// サーバー起動
startServer();