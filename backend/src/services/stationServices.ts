import type { Station } from "@prisma/client";
//import { getPrismaClient } from "../config/database.js";
import * as stationRepository from "../repositories/stationRepository.js";
import fs from "fs";
import path from "path";
import {
  findAllStations,
  findStationById,
  deleteStation,
  upsertMultipleStations,
} from "../repositories/stationRepository.js";

// Service層が知ってよい型
type StationRepository = {
  findAllStations: () => Promise<Station[]>;
  findStationById: (id: number) => Promise<Station | null>;
  upsertMultipleStations: (stations: any[]) => Promise<void>;
  deleteStation: (id: number) => Promise<Station>;
};
/**
 * ビジネスロジック層：駅情報のビジネスロジック処理
 */

/**
 * 全ての駅情報を取得するサービス
 */
export async function getAllStations(): Promise<Station[]> {
  return findAllStations();
}
/**
 * メイン関数：stations.json をインポート
 * @param prismaClient - 外部から渡されたPrismaクライアント（オプション）
 * @param forceImport - 強制的にインポートするかどうか（デフォルト: false）
 */
export async function importStations(
  forceImport: boolean = false,
  repository: StationRepository = stationRepository
): Promise<void> {
  try {
    // DBに既存データがある場合はスキップ
    if (!forceImport) {
      const existingStations = await findAllStations();
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
    await importStationsToDatabase(stations, repository);
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
  repository: StationRepository
): Promise<void> {
  for (const station of stations) {
    try {
      console.log(`Processing station: ID=${station.id}, Name=${station.name}`);
      await repository.upsertMultipleStations([station]);
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
): Promise<Station | null> {

  // ID の妥当性チェック
  if (isNaN(id)) {
    throw new Error("無効なID形式です");
  }

  const station = await findStationById(id);
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
): Promise<{ message: string; count: number }> {

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
  await upsertMultipleStations(stations);

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
): Promise<Station> {

  // ID の妥当性チェック
  if (isNaN(id)) {
    throw new Error("無効なID形式です");
  }

  // 削除対象の駅が存在するか確認
  const station = await findStationById(id);
  if (!station) {
    throw new Error("駅が見つかりません");
  }

  return deleteStation(id);
}