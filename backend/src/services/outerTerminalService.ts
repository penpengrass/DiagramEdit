import type { OuterTerminalStation } from "@prisma/client";
import * as outerTerminalRepository from "../repositories/outerTerminalRepository.js";

export type OuterTerminalCreateInput = {
  station_id: number;
  terminal_id?: number | null;
  name: string;
  ryakushou?: string | null;
};

/**
 * ビジネスロジック層：路線外駅マスタの取得・登録・削除
 */
export async function getAllOuterTerminals(): Promise<OuterTerminalStation[]> {
  return outerTerminalRepository.findAllOuterTerminals();
}

export async function getOuterTerminalsByStationId(stationId: number): Promise<OuterTerminalStation[]> {
  if (!Number.isInteger(stationId) || stationId <= 0) {
    throw new Error("stationId must be a positive integer");
  }

  return outerTerminalRepository.findOuterTerminalsByStationId(stationId);
}

export async function createOuterTerminal(data: OuterTerminalCreateInput): Promise<OuterTerminalStation> {
  if (!data.name || data.name.trim() === "") {
    throw new Error("name is required");
  }

  return outerTerminalRepository.createOuterTerminal(data);
}

export async function createManyOuterTerminals(rows: OuterTerminalCreateInput[]): Promise<void> {
  if (!Array.isArray(rows)) {
    throw new Error("rows must be an array");
  }

  await outerTerminalRepository.createManyOuterTerminals(rows);
}

export async function deleteOuterTerminalsByStationId(stationId: number): Promise<void> {
  if (!Number.isInteger(stationId) || stationId <= 0) {
    throw new Error("stationId must be a positive integer");
  }

  await outerTerminalRepository.deleteOuterTerminalsByStationId(stationId);
}

export async function deleteAllOuterTerminals(): Promise<void> {
  await outerTerminalRepository.deleteAllOuterTerminals();
}
