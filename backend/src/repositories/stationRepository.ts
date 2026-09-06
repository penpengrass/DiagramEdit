import type { Station } from "@prisma/client";
import { getPrismaClient } from "../config/database.js";

/**
 * データアクセス層：駅情報のDB操作
 */

/**
 * 全ての駅情報を取得
 */
export async function findAllStations(): Promise<Station[]> {
  const prisma = getPrismaClient();
  return await prisma.station.findMany({
    orderBy: {
      id: 'asc',
    },
  });
}

/**
 * IDで特定の駅情報を取得
 */
export async function findStationById(
  id: number,
): Promise<Station | null> {
  const client = getPrismaClient();
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
    //route_id?: number;
  },
): Promise<Station> {
  const client = getPrismaClient();

  // updateオブジェクトを条件付きで構築
  const updateData: any = {
    name: stationData.name,
  };
  /*if (stationData.route_id !== undefined) {
    updateData.route_id = stationData.route_id;
  }*/
  if (stationData.layout !== undefined) {
    updateData.layout = stationData.layout;
  }
  if (stationData.main !== undefined) {
    updateData.main = stationData.main;
  }
  if (stationData.railnumber !== undefined) {
    // `railnumber` は stations.json では配列で来るため、Prisma のネスト作成形式に変換する
    if (Array.isArray(stationData.railnumber)) {
      // update 時は既存の railnumber をそのまま更新せず作成のみ行う（重複対策は別途）
      // Prisma の create に渡す形式: { create: [ { rail_id, name, ryakushou } ] }
      updateData.railnumber = { create: stationData.railnumber.map((r: any) => ({
        rail_id: r.id ?? r.rail_id,
        name: r.name ?? '',
        ryakushou: r.ryakushou ?? r.ryakushou ?? '',
      })) };
    } else {
      updateData.railnumber = stationData.railnumber;
    }
  }
  if (stationData.outerterminal !== undefined) {
    updateData.outerterminal = stationData.outerterminal;
  }

  // createオブジェクトを条件付きで構築
  const createData: any = {
    id: stationData.id,
    name: stationData.name,
  };
  /*if (stationData.route_id !== undefined) {
    createData.route_id = stationData.route_id;
  } else {
    // schema 上 route_id は必須なので、指定がない場合はデフォルト 0 を設定する
    createData.route_id = 0;
  }*/
  if (stationData.layout !== undefined) {
    createData.layout = stationData.layout;
  }
  if (stationData.main !== undefined) {
    createData.main = stationData.main;
  }
  if (stationData.railnumber !== undefined) {
    if (Array.isArray(stationData.railnumber)) {
      createData.railnumber = { create: stationData.railnumber.map((r: any) => ({
        rail_id: r.id ?? r.rail_id,
        name: r.name ?? '',
        ryakushou: r.ryakushou ?? '',
        //station_id: stationData.id, // unchecked では不要だが ensure for clarity
      })) };
    } else {
      createData.railnumber = stationData.railnumber;
    }
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
): Promise<Station> {
  const client = getPrismaClient();
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
    route_id?: number;
  }>,
): Promise<void> {
  for (const station of stationsData) {
    await upsertStation(station);
  }
}