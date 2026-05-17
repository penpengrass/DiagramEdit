import express from "express";
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
 * OUDファイルを解析
 * POST /api/train-types/parse-oud
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
 * POST /api/train-types/import
 * Body: { trainTypes: Array<{code: string|number, name: string, shortName: string, color: string}> }
 */
router.post("/import", async (req: any, res: any) => {
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
 * GET /api/train-types
 */
router.get("/", async (req: any, res: any) => {
  try {
    const trainTypes = await getAllTrainTypes();
    res.json(trainTypes);
  } catch (err: any) {
    console.error("Error fetching train types:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;