import 'dotenv/config';
import { initPrisma, testDatabaseConnection, disconnectPrisma } from '../src/config/database.js';
import { importStations, importTrainTypes } from '../../shared/parsers/oudParser.js';

/**
 * Prisma Seed スクリプト
 * DB の初期化とデータのシード処理を実行
 * 実行: npx prisma db seed
 */
async function main(): Promise<void> {
  try {
    console.log("🌱 Starting database seed...");
    
    console.log("⏳ Initializing Prisma...");
    initPrisma();

    console.log("⏳ Testing database connection...");
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database connection timeout (5s)")), 5000)
    );
    const connectionPromise = testDatabaseConnection();
    await Promise.race([connectionPromise, timeoutPromise]);

    console.log("⏳ Importing stations from stations.json...");
    await importStations(undefined, true); // forceImport=true で強制実行

    console.log("⏳ Importing train types from trainTypes.json...");
    await importTrainTypes(undefined, true); // forceImport=true で強制実行

    console.log("✅ Database seed completed successfully!");
  } catch (err: any) {
    console.error("❌ Seed failed:", err.message || err);
    process.exit(1);
  } finally {
    await disconnectPrisma();
  }
}

main();
