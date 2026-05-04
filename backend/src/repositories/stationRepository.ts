import { PrismaClient } from "@prisma/client";
import type { Station } from "@prisma/client";
import { getPrismaClient } from "../config/database.js";

/**
 * データアクセス層：駅情報のDB操作
 */

/**
 * 全ての駅情報を取得
 */
export async function findAllStations(prisma?: PrismaClient): Promise<Station[]> {
  const client = prisma || getPrismaClient();
  return client.station.findMany();
}

/**
 * IDで特定の駅情報を取得
 */
export async function findStationById(
  id: number,
  prisma?: PrismaClient
): Promise<Station | null> {
  const client = prisma || getPrismaClient();
  return client.station.findUnique({
    where: { id },
  });
}

/**
 * 駅情報をupsert（存在しない場合は作成、存在する場合は更新）
 */
export async function upsertStation(
  stationData: {
    id: number;
    name: string;
    layout?: string | null;
    main?: string | null;
    railnumber?: string | null;
    outerterminal?: string | null;
  },
  prisma?: PrismaClient
): Promise<Station> {
  const client = prisma || getPrismaClient();

  // updateオブジェクトを条件付きで構築
  const updateData: any = {
    name: stationData.name,
  };
  if (stationData.layout !== undefined) {
    updateData.layout = stationData.layout;
  }
  if (stationData.main !== undefined) {
    updateData.main = stationData.main;
  }
  if (stationData.railnumber !== undefined) {
    updateData.railnumber = stationData.railnumber;
  }
  if (stationData.outerterminal !== undefined) {
    updateData.outerterminal = stationData.outerterminal;
  }

  // createオブジェクトを条件付きで構築
  const createData: any = {
    id: stationData.id,
    name: stationData.name,
  };
  if (stationData.layout !== undefined) {
    createData.layout = stationData.layout;
  }
  if (stationData.main !== undefined) {
    createData.main = stationData.main;
  }
  if (stationData.railnumber !== undefined) {
    createData.railnumber = stationData.railnumber;
  }
  if (stationData.outerterminal !== undefined) {
    createData.outerterminal = stationData.outerterminal;
  }

  return client.station.upsert({
    where: { id: stationData.id },
    update: updateData,
    create: createData,
  });
}

/**
 * IDで駅情報を削除
 */
export async function deleteStation(
  id: number,
  prisma?: PrismaClient
): Promise<Station> {
  const client = prisma || getPrismaClient();
  return client.station.delete({
    where: { id },
  });
}

/**
 * 複数の駅情報をupsert
 */
export async function upsertMultipleStations(
  stationsData: Array<{
    id: number;
    name: string;
    layout?: string | null;
    main?: string | null;
    railnumber?: string | null;
    outerterminal?: string | null;
  }>,
  prisma?: PrismaClient
): Promise<void> {
  const client = prisma || getPrismaClient();
  for (const station of stationsData) {
    await upsertStation(station, client);
  }
}