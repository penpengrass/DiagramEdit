import type { OuterTerminalStation } from "@prisma/client";
import { getPrismaClient } from "../config/database.js";

/**
 * データアクセス層：路線外発着駅（OuterTerminal）のDB操作
 */

export async function findAllOuterTerminals(): Promise<OuterTerminalStation[]> {
  const client = getPrismaClient();
  return client.outerTerminalStation.findMany({ orderBy: { id: 'asc' } });
}

export async function findOuterTerminalsByStationId(stationId: number): Promise<OuterTerminalStation[]> {
  const client = getPrismaClient();
  return client.outerTerminalStation.findMany({ where: { station_id: stationId }, orderBy: { id: 'asc' } });
}

export async function createOuterTerminal(data: {
  station_id: number;
  terminal_id?: number | null;
  name: string;
  ryakushou?: string | null;
}
): Promise<OuterTerminalStation> {
  const client = getPrismaClient();
  return client.outerTerminalStation.create({ data });
}

export async function createManyOuterTerminals(rows: Array<{
  station_id: number;
  terminal_id?: number | null;
  name: string;
  ryakushou?: string | null;
}>): Promise<void> {
  if (rows.length === 0) return;
  const client = getPrismaClient();
  await client.outerTerminalStation.createMany({ data: rows, skipDuplicates: true });
}

export async function deleteOuterTerminalsByStationId(stationId: number): Promise<void> {
  const client = getPrismaClient();
  await client.outerTerminalStation.deleteMany({ where: { station_id: stationId } });
}

export async function deleteAllOuterTerminals(): Promise<void> {
  const client = getPrismaClient();
  await client.outerTerminalStation.deleteMany();
}


/* ==========================================================================
   ▼▼▼ 【プレゼンテーション層】controllers/outerTerminalController.ts に移動すべきコード ▼▼▼
   ==========================================================================
   リポジトリ層で Express の `res` や HTTP ステータスコードを直接操作するのは階層違反となります。
   以下のロジックはコントローラー側に実装してください。

export async function handleCreateManyOuterTerminals(req: Request, res: Response) {
  try {
    const rows = req.body; // もしくは適切なデータ抽出
    await createManyOuterTerminals(rows);
    return res.status(201).json({ message: "路線外発着駅データを一括登録しました。" });
  } catch (error) {
    console.error("路線外発着駅一括登録エラー:", error);
    return res.status(500).json({ error: "サーバー内部のエラーが発生しました。" });
  }
}

export async function handleClearAndCreateOuterTerminals(req: Request, res: Response) {
  try {
    const rows = req.body;
    
    // トランザクション処理やクリーンアップの指示は本来Service層で行うのがベスト
    await deleteAllOuterTerminals();
    await createManyOuterTerminals(rows);

    return res.status(200).json({ message: "路線外発着駅データを全入れ替えしました。" });
  } catch (error) {
    console.error("データ入れ替えエラー:", error);
    return res.status(500).json({ error: "入れ替え処理に失敗しました。" });
  }
}
========================================================================== */
