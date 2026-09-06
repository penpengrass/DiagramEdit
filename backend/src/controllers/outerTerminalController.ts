import express from "express";
import type { Request, Response } from "express";
import {
  createManyOuterTerminals,
  createOuterTerminal,
  deleteAllOuterTerminals,
  deleteOuterTerminalsByStationId,
  getAllOuterTerminals,
  getOuterTerminalsByStationId,
} from "../services/outerTerminalService.js";

const router = express.Router();

function parseStationId(value: unknown): number {
  const stationId = Number(value);
  if (!Number.isInteger(stationId) || stationId <= 0) {
    throw new Error("stationId must be a positive integer");
  }
  return stationId;
}

router.get("/", async (_req: Request, res: Response) => {
  try {
    const outerTerminals = await getAllOuterTerminals();
    res.json(outerTerminals);
  } catch (err: any) {
    console.error("Error fetching outer terminals:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/station/:stationId", async (req: Request, res: Response) => {
  try {
    const stationId = parseStationId(req.params.stationId);
    const outerTerminals = await getOuterTerminalsByStationId(stationId);
    res.json(outerTerminals);
  } catch (err: any) {
    console.error("Error fetching outer terminals by station:", err);
    if (err.message.includes("stationId")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const outerTerminal = await createOuterTerminal(req.body);
    res.status(201).json(outerTerminal);
  } catch (err: any) {
    console.error("Error creating outer terminal:", err);
    if (err.message.includes("required")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post("/batch", async (req: Request, res: Response) => {
  try {
    const rows = req.body;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: "rows must be an array" });
    }

    await createManyOuterTerminals(rows);
    res.status(201).json({ message: "outer terminals created successfully", count: rows.length });
  } catch (err: any) {
    console.error("Error creating outer terminals in batch:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/station/:stationId", async (req: Request, res: Response) => {
  try {
    const stationId = parseStationId(req.params.stationId);
    await deleteOuterTerminalsByStationId(stationId);
    res.json({ message: "outer terminals deleted", stationId });
  } catch (err: any) {
    console.error("Error deleting outer terminals by station:", err);
    if (err.message.includes("stationId")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete("/", async (_req: Request, res: Response) => {
  try {
    await deleteAllOuterTerminals();
    res.json({ message: "all outer terminals deleted" });
  } catch (err: any) {
    console.error("Error deleting all outer terminals:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
