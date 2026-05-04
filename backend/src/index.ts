import 'dotenv/config';
import app from "./app.js";
import { initPrisma, testDatabaseConnection, disconnectPrisma } from "./config/database.js";
import { importStations } from "./parsers/oudParser.js";

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
    initPrisma();

    console.log("⏳ Testing database connection...");
    // タイムアウト付きでDB接続テスト
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database connection timeout (5s)")), 5000)
    );
    const connectionPromise = testDatabaseConnection();
    await Promise.race([connectionPromise, timeoutPromise]);

    // stations.json をインポート
    console.log("⏳ Importing stations...");
    await importStations();

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