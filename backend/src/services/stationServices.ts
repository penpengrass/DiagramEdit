import { PrismaClient } from "@prisma/client";
import type { Station } from "@prisma/client";
import { getPrismaClient } from "../config/database.js";
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