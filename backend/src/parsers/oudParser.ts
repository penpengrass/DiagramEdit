import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "../config/database.js";
import { upsertMultipleStations, findAllStations } from "../repositories/stationRepository.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * パーサー層：JSON ファイルから駅情報を読み込んで DB に保存
 */

/**
 * stations.json から駅情報を読み込む
 */
function loadStationsFromJson(dataPath: string): any[] {
  if (!fs.existsSync(dataPath)) {
    console.warn(`⚠️  stations.json not found at ${dataPath}`);
    return [];
  }

  const data = fs.readFileSync(dataPath, "utf-8");
  return JSON.parse(data);
}

/**
 * 読み込んだ駅情報を DB にインポート
 */
async function importStationsToDatabase(
  stations: any[],
  prisma: PrismaClient
): Promise<void> {
  for (const station of stations) {
    try {
      console.log(`Processing station: ID=${station.id}, Name=${station.name}`);
      await upsertMultipleStations([station], prisma);
      console.log(`✅ Station ${station.id} imported successfully`);
    } catch (err: any) {
      console.error(`❌ Failed to import station ${station.id}:`, {
        code: err.code,
        message: err.message,
        meta: err.meta,
        modelName: err.meta?.modelName,
        cause: err.meta?.cause,
      });
      throw err;
    }
  }
}

/**
 * メイン関数：stations.json をインポート
 * @param prismaClient - 外部から渡されたPrismaクライアント（オプション）
 * @param forceImport - 強制的にインポートするかどうか（デフォルト: false）
 */
export async function importStations(prismaClient?: PrismaClient, forceImport: boolean = false): Promise<void> {
  const prisma = prismaClient || getPrismaClient();

  try {
    // DBに既存データがある場合はスキップ
    if (!forceImport) {
      const existingStations = await findAllStations(prisma);
      if (existingStations.length > 0) {
        console.log(`✅ Database already contains ${existingStations.length} stations. Skipping import.`);
        return;
      }
    }

    const dataPath = path.join(__dirname, "../../stations.json");
    console.log("📂 Loading stations from JSON...");
    
    const stations = loadStationsFromJson(dataPath);
    
    if (stations.length === 0) {
      console.warn("⚠️  No stations to import");
      return;
    }

    console.log(`📊 Found ${stations.length} stations to import`);
    await importStationsToDatabase(stations, prisma);
    console.log(`✅ Import successful: ${stations.length} stations imported`);
  } catch (e: any) {
    console.error("❌ Import failed:", e.message || e);
  } finally {
    // 外部から渡されたprismaClientの場合は切断しない
    if (!prismaClient) {
      await prisma.$disconnect();
    }
  }
}

/**
 * スクリプト単体で実行された場合
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  importStations();
}