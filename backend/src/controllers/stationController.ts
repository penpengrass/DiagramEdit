import express from "express";
import {
  getAllStations,
  getStationById,
  importStationsService,
  removeStation,
} from "../services/stationServices.js";
import {
  //importTrainTypesFromOudService,
  getAllTrainTypes,
  saveTrainTypesService,
} from "../services/trainTypesService.js";
import { parseOud } from "@shared/parsers/oudParser";

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
 * OUDファイルを解析
 * POST /api/stations/parse-oud
 * Body: { fileContent: string, fileName: string }
 */
router.post("/parse-oud", async (req: any, res: any) => {
  try {
    const { fileContent, fileName } = req.body;

    if (!fileContent) {
      return res.status(400).json({ error: "fileContent is required" });
    }

    if (!fileName) {
      return res.status(400).json({ error: "fileName is required" });
    }

    const oudData = parseOud(fileContent, fileName);
    res.json(oudData);
  } catch (err: any) {
    console.error("Error parsing OUD file:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * OUDファイルから列車種別をインポート（フロント側で解析してから送信）
 * POST /api/stations/import-train-types
 * Body: { trainTypes: Array<{code: string|number, name: string, shortName: string, color: string}> }
 */
router.post("/import-train-types", async (req: any, res: any) => {
  try {
    const { trainTypes } = req.body;

    if (!trainTypes || !Array.isArray(trainTypes)) {
      return res.status(400).json({ error: "trainTypes array is required" });
    }

    if (trainTypes.length === 0) {
      return res.status(400).json({ error: "trainTypes array cannot be empty" });
    }

    const savedTrainTypes = await saveTrainTypesService(trainTypes);
    res.json({
      success: true,
      message: `Successfully imported ${savedTrainTypes.length} train types`,
      trainTypes: savedTrainTypes,
    });
  } catch (err: any) {
    console.error("Error importing train types:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 全ての列車種別を取得
 * GET /api/stations/train-types
 */
router.get("/train-types", async (req: any, res: any) => {
  try {
    const trainTypes = await getAllTrainTypes();
    res.json(trainTypes);
  } catch (err: any) {
    console.error("Error fetching train types:", err);
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