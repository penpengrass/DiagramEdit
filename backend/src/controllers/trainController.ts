import { Router } from 'express';
import type { Request, Response } from 'express';
import * as trainService from '../services/trainService.js';
import type { CreateTrainData } from '@shared/types/timetable';

/**
 * Controller層：HTTPリクエスト・レスポンスを処理
 */
const trainRouter = Router();

function parseDiagramId(value: unknown): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function getDiaType(value: unknown): string {
  return typeof value === 'string' && value.trim() !== '' ? value : 'weekday';
}

/**
 * POST /api/trains
 * 単一の列車データを保存する
 */
trainRouter.post('/', async (req: Request, res: Response) => {
  try {
    const trainData = req.body as CreateTrainData & { diaType?: string };

    // リクエストボディのバリデーション
    if (!trainData) {
      res.status(400).json({
        error: 'Request body is required',
      });
      return;
    }

    const trainId = await trainService.saveTrain(trainData);

    res.status(201).json({
      success: true,
      message: 'Train saved successfully',
      trainId,
    });
  } catch (error) {
    console.error('Error saving train:', error);
    res.status(400).json({
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/trains/batch
 * 複数の列車データを一括保存する
 */
trainRouter.post('/batch', async (req: Request, res: Response) => {
  try {
    const body = req.body as
      | (CreateTrainData & { diaType?: string })[]
      | {
          trains?: (CreateTrainData & { diaType?: string })[];
          diagramId?: number;
          diaType?: string;
        };

    const trainsData = Array.isArray(body) ? body : body.trains;

    // リクエストボディのバリデーション
    if (!Array.isArray(trainsData)) {
      res.status(400).json({
        error: 'Request body must be an array of train data or { trains: [...] }',
      });
      return;
    }

    if (trainsData.length === 0) {
      res.status(400).json({
        error: 'At least one train data entry is required',
      });
      return;
    }
    // ダイヤ識別を追加
    const commonDiagramId = Array.isArray(body) ? undefined : body.diagramId;
    const commonDiaType = Array.isArray(body) ? undefined : body.diaType;
    const normalizedTrainsData = trainsData.map((trainData) => {
      const normalizedTrainData: CreateTrainData & { diaType?: string } = { ...trainData };
      const diagramId = trainData.diagramId ?? commonDiagramId;
      const diaType = trainData.diaType ?? commonDiaType;

      if (diagramId !== undefined) {
        normalizedTrainData.diagramId = diagramId;
      }

      if (diaType !== undefined) {
        normalizedTrainData.diaType = diaType;
      }

      return normalizedTrainData;
    });

    const trainIds = await trainService.saveMultipleTrains(normalizedTrainsData);

    res.status(201).json({
      success: true,
      message: `${trainIds.length} train(s) saved successfully`,
      trainIds,
      count: trainIds.length,
    });
  } catch (error) {
    console.error('Error saving trains:', error);
    res.status(400).json({
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/trains
 * 全列車を取得する
 */
trainRouter.get('/', async (req: Request, res: Response) => {
  try {
    const diagramId = await trainService.getDiagramIdForSearch(
      parseDiagramId(req.query.diagramId),
      getDiaType(req.query.diaType),
    );
    const trains = await trainService.getAllTrains(diagramId);

    res.status(200).json({
      success: true,
      diagramId,
      data: trains,
      count: trains.length,
    });
  } catch (error) {
    console.error('Error fetching trains:', error);
    res.status(500).json({
      error: (error as Error).message || 'Failed to fetch trains',
    });
  }
});

trainRouter.get('/by-direction/:direction', async (req: Request, res: Response) => {
  try {
    const { direction } = req.params;

    if (direction !== 'Kudari' && direction !== 'Nobori') {
      res.status(400).json({
        error: 'Direction must be either "Kudari" or "Nobori"',
      });
      return;
    }

    const diagramId = await trainService.getDiagramIdForSearch(
      parseDiagramId(req.query.diagramId),
      getDiaType(req.query.diaType),
    );
    const trains = await trainService.getTrainsByDirection(diagramId, direction);

    res.status(200).json({
      success: true,
      diagramId,
      data: trains,
      count: trains.length,
    });
  } catch (error) {
    console.error('Error fetching trains by direction:', error);
    res.status(500).json({
      error: (error as Error).message || 'Failed to fetch trains',
    });
  }
});

trainRouter.get('/by-number/:trainNumber', async (req: Request, res: Response) => {
  try {
    const { trainNumber } = req.params;

    if (typeof trainNumber !== 'string' || trainNumber === '') {
      res.status(400).json({
        error: 'Train number is required',
      });
      return;
    }

    const diagramId = await trainService.getDiagramIdForSearch(
      parseDiagramId(req.query.diagramId),
      getDiaType(req.query.diaType),
    );
    const train = await trainService.getTrainByNumber(diagramId, trainNumber);

    if (!train) {
      res.status(404).json({
        error: 'Train not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      diagramId,
      data: train,
    });
  } catch (error) {
    console.error('Error fetching train by number:', error);
    res.status(500).json({
      error: (error as Error).message || 'Failed to fetch train',
    });
  }
});

/**
 * GET /api/trains/:trainId
 * 特定の列車を取得する
 */
trainRouter.get('/:trainId', async (req: Request, res: Response) => {
  try {
    const { trainId } = req.params;

    if (typeof trainId !== 'string' || trainId === '') {
      res.status(400).json({
        error: 'Train ID is required',
      });
      return;
    }

    const train = await trainService.getTrainById(trainId);

    if (!train) {
      res.status(404).json({
        error: 'Train not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: train,
    });
  } catch (error) {
    console.error('Error fetching train:', error);
    res.status(500).json({
      error: 'Failed to fetch train',
    });
  }
});
//ここから下は使うか不明
/**
 * GET /api/trains/by-direction/:direction
 * 指定した方向の列車を取得する
 */
/*trainRouter.get('/by-direction/:direction', async (req: Request, res: Response) => {
  try {
    const { direction } = req.params;

    if (direction !== 'Kudari' && direction !== 'Nobori') {
      res.status(400).json({
        error: 'Direction must be either "Kudari" or "Nobori"',
      });
      return;
    }

    const trains = await trainService.getTrainsByDirection(direction);

    res.status(200).json({
      success: true,
      data: trains,
      count: trains.length,
    });
  } catch (error) {
    console.error('Error fetching trains by direction:', error);
    res.status(500).json({
      error: 'Failed to fetch trains',
    });
  }
});
*/

/**
 * GET /api/trains/by-number/:trainNumber
 * 列車番号で列車を検索する
 */
/*trainRouter.get('/by-number/:trainNumber', async (req: Request, res: Response) => {
  try {
    const { trainNumber } = req.params;

    if (typeof trainNumber !== 'string' || trainNumber === '') {
      res.status(400).json({
        error: 'Train number is required',
      });
      return;
    }

    const train = await trainService.getTrainByNumber(trainNumber);

    if (!train) {
      res.status(404).json({
        error: 'Train not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: train,
    });
  } catch (error) {
    console.error('Error fetching train by number:', error);
    res.status(500).json({
      error: 'Failed to fetch train',
    });
  }
});*/

export default trainRouter;
