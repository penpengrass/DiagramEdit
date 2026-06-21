import type { OuterTerminalStation } from "@prisma/client";
import { getPrismaClient } from "../config/database.js";

/**
 * データアクセス層：路線外発着駅（OuterTerminal）のDB操作
 */

export async function findAllOuterTerminals(): Promise<OuterTerminalStation[]> {
  const client = getPrismaClient();
  return client.outerTerminalStation.findMany({ orderBy: { id: 'asc' } });
}

export async function findOuterTerminalsByStationId(
  stationId: number,
): Promise<OuterTerminalStation[]> {
  const client = getPrismaClient();
  return client.outerTerminalStation.findMany({ where: { station_id: stationId }, orderBy: { id: 'asc' } });
}

export async function createOuterTerminal(
  data: {
    station_id: number;
    terminal_id?: number | null;
    name: string;
    jikoku_raw?: string | null;
    diaryaku?: string | null;
  },
): Promise<OuterTerminalStation> {
  const client = getPrismaClient();
  return client.outerTerminalStation.create({ data });
}

export async function createManyOuterTerminals(
  rows: Array<{
    station_id: number;
    terminal_id?: number | null;
    name: string;
    jikoku_raw?: string | null;
    diaryaku?: string | null;
  }>,
): Promise<void> {
  if (rows.length === 0) return;
  const client = getPrismaClient();
  // createMany を使い、重複はスキップする（unique 制約があるため）
  await client.outerTerminalStation.createMany({ data: rows, skipDuplicates: true });
}

export async function deleteOuterTerminalsByStationId(
  stationId: number,
): Promise<void> {
  const client = getPrismaClient();
  await client.outerTerminalStation.deleteMany({ where: { station_id: stationId } });
}

export async function deleteAllOuterTerminals(): Promise<void> {
  const client = getPrismaClient();
  await client.outerTerminalStation.deleteMany({});
}

export default {
  findAllOuterTerminals,
  findOuterTerminalsByStationId,
  createOuterTerminal,
  createManyOuterTerminals,
  deleteOuterTerminalsByStationId,
  deleteAllOuterTerminals,
};
