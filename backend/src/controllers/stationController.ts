import express from "express";
import {
  getAllStations,
  getStationById,
  importStationsService,
  removeStation,
} from "../services/stationServices.js";

/**
 * プレゼンテーション層：HTTP リクエスト/レスポンスの処理
 */

const router = express.Router();

/**
 * 全駅情報を取得
 * GET /api/stations
 */
router.get("/", async (req: any, res: any) => {
  try {
    const stations = await getAllStations();
    res.json(stations);
  } catch (err: any) {
    console.error("Error fetching stations:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 特定の駅情報を取得
 * GET /api/stations/:id
 */
router.get("/:id", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const station = await getStationById(id);
    res.json(station);
  } catch (err: any) {
    if (err.message.includes("無効な")) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message.includes("見つかりません")) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * 駅情報をDBに追加/更新
 * POST /api/stations/import
 */
router.post("/import", async (req: any, res: any) => {
  try {
    const result = await importStationsService(req.body);
    res.json(result);
  } catch (err: any) {
    if (err.message.includes("配列")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * 駅情報を削除
 * DELETE /api/stations/:id
 */
router.delete("/:id", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const station = await removeStation(id);
    res.json({ message: "削除成功", station });
  } catch (err: any) {
    if (err.message.includes("無効な")) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message.includes("見つかりません")) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;