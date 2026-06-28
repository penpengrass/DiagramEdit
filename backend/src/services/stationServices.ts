import type { Station } from "@prisma/client";
//import { getPrismaClient } from "../config/database.js";
import * as stationRepository from "../repositories/stationRepository.js";
import * as trainRepository from "../repositories/trainRepository.js"
import * as outerTerminalRepository from "../repositories/outerTerminalRepository.js";
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
    await importOuterTerminalsToDatabase(stations);
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

async function importOuterTerminalsToDatabase(
  stations: any[]
): Promise<void> {
  const rows = stations.flatMap((station) => {
    if (!Array.isArray(station.outerterminal)) return [];

    return station.outerterminal.map((terminal: any) => ({
      station_id: station.id,
      terminal_id: terminal.id ?? null,
      name: terminal.jikoku ?? terminal.name ?? "",
      ryakushou: terminal.diaryaku ?? null,
    }));
  });

  if (rows.length === 0) {
    console.log("No outer terminal stations to import");
    return;
  }

  await outerTerminalRepository.createManyOuterTerminals(rows);
  console.log(`Outer terminal import successful: ${rows.length} rows imported`);
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
/**
 * oud2ファイル（またはパース後のJSON）から
 * ダイヤデータ全体を正しい順序でDBにインポートするメインサービス
 */
export async function importAllDiaDataService(parsedOudData: any): Promise<void> {
  try {
    // ----------------------------------------------------
    // ステップ1: 自路線の駅マスタ (Station) のインポート
    // ----------------------------------------------------
    if (parsedOudData.stations && parsedOudData.stations.length > 0) {
      await stationRepository.upsertMultipleStations(parsedOudData.stations);
      console.log(`[Import] 自線駅マスタを登録しました: ${parsedOudData.stations.length}件`);
    }

    // ----------------------------------------------------
    // ステップ2: 路線外の駅マスタ (OuterTerminal) のインポート
    // ※ 列車データを入れる前に、これがDBに存在している必要があります！
    // ----------------------------------------------------
    if (parsedOudData.outerTerminals && parsedOudData.outerTerminals.length > 0) {
      // Service層にはPrismaを書かず、Repository層の関数に配列を丸ごと渡す
      await outerTerminalRepository.createManyOuterTerminals(parsedOudData.outerTerminals);
      console.log(`[Import] 路線外駅マスタを登録しました: ${parsedOudData.outerTerminals.length}件`);
    } else {
      console.log("[Import] 登録対象の路線外駅マスタはありません");
    }

    // ----------------------------------------------------
    // ステップ3: 列車・時刻表データ (Train / OuterTime) のインポート
    // ----------------------------------------------------
    if (parsedOudData.trains && parsedOudData.trains.length > 0) {
      console.log(`[Import] 列車データの登録を開始します...`);
      
      // ループを回して、1本ずつ repository の createTrain を呼び出す
      for (const trainData of parsedOudData.trains) {
        try {
          await trainRepository.createTrain(trainData);
        } catch (trainError) {
          console.error(`列車番号 ${trainData.trainNumber} の登録に失敗しました:`, trainError);
          // 1本の失敗で全体を止めない場合は throw せずに continue; させることも可能
          throw trainError; 
        }
      }
      console.log(`[Import] 列車・時刻表データを登録しました: ${parsedOudData.trains.length}件`);
    }

  } catch (error) {
    console.error("ダイヤデータのインポート中にエラーが発生しました:", error);
    throw error;
  }
}