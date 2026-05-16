import { PrismaClient } from "@prisma/client";
import type { Station } from "@prisma/client";
import { getPrismaClient } from "../config/database.js";
import fs from "fs";
import path from "path";
import {
  findAllStations,
  findStationById,
  deleteStation,
  upsertMultipleStations,
} from "../repositories/stationRepository.js";

/**
 * ビジネスロジック層：駅情報のビジネスロジック処理
 */

/**
 * 全ての駅情報を取得するサービス
 */
export async function getAllStations(prisma?: PrismaClient): Promise<Station[]> {
  const client = prisma || getPrismaClient();
  return findAllStations(client);
}
/**
 * メイン関数：stations.json をインポート
 * @param prismaClient - 外部から渡されたPrismaクライアント（オプション）
 * @param forceImport - 強制的にインポートするかどうか（デフォルト: false）
 */
export async function importStations(prismaClient: any, forceImport: boolean = false): Promise<void> {
  if (!prismaClient) {
    throw new Error("importStations requires a Prisma client passed as the first argument");
  }
  const prisma = prismaClient;

  try {
    // DBに既存データがある場合はスキップ
    if (!forceImport) {
      const existingStations = await findAllStations(prisma);
      if (existingStations.length > 0) {
        console.log(`✅ Database already contains ${existingStations.length} stations. Skipping import.`);
        return;
      }
    }

    const dataPath = path.join(__dirname, "../../../backend/prisma/seeds/stations.json");
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
    // Do not disconnect the client here. Caller manages lifecycle.
  }
}
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
  prisma: any
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
 * 特定の駅情報を取得するサービス
 */
export async function getStationById(
  id: number,
  prisma?: PrismaClient
): Promise<Station | null> {
  const client = prisma || getPrismaClient();
  
  // ID の妥当性チェック
  if (isNaN(id)) {
    throw new Error("無効なID形式です");
  }

  const station = await findStationById(id, client);
  if (!station) {
    throw new Error("駅が見つかりません");
  }

  return station;
}

/**
 * 複数の駅情報をインポート/更新するサービス
 */
export async function importStationsService(
  stations: any[],
  prisma?: PrismaClient
): Promise<{ message: string; count: number }> {
  const client = prisma || getPrismaClient();

  // リクエストの検証
  if (!Array.isArray(stations)) {
    throw new Error("駅データの配列が必要です");
  }

  if (stations.length === 0) {
    throw new Error("最低1つの駅データが必要です");
  }

  // 各駅のバリデーション
  for (const station of stations) {
    if (!station.id || !station.name) {
      throw new Error("駅IDと駅名は必須です");
    }
  }

  // DB にインポート
  await upsertMultipleStations(stations, client);

  return {
    message: "インポート成功",
    count: stations.length,
  };
}

/**
 * 駅情報を削除するサービス
 */
export async function removeStation(
  id: number,
  prisma?: PrismaClient
): Promise<Station> {
  const client = prisma || getPrismaClient();

  // ID の妥当性チェック
  if (isNaN(id)) {
    throw new Error("無効なID形式です");
  }

  // 削除対象の駅が存在するか確認
  const station = await findStationById(id, client);
  if (!station) {
    throw new Error("駅が見つかりません");
  }

  return deleteStation(id, client);
}