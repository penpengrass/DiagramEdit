//ここにPrismaClientは書かない。
import * as trainRepository from '../repositories/trainRepository.js';
import * as trainTypesRepository from '../repositories/trainTypesRepository.js';
import type { CreateTrainData } from '@shared/types/timetable';

type TrainDataWithDiaType = Omit<CreateTrainData, 'diagramId'> & {
  diagramId?: number;
  diaType?: string;
};
/**
 * Service層：列車データのビジネスロジックを担当
 */

/**
 * 単一の列車データをDB保存する
 * @param trainData DB保存用の列車データ
 * @returns 保存された列車ID
 * @throws 列車種別が見つからない場合など
 */
export async function saveTrain(trainData: TrainDataWithDiaType): Promise<string> {
  const normalizedTrainData = await normalizeTrainData(trainData);
  validateTrainData(normalizedTrainData);

  const trainType = await trainTypesRepository.findTrainTypeByCode(
    normalizedTrainData.trainTypeCode,
  );

  if (!trainType) {
    throw new Error(`TrainType with code ${normalizedTrainData.trainTypeCode} not found`);
  }

  try {
    return await trainRepository.createTrain(normalizedTrainData);
  } catch (error) {
    throw new Error(`Failed to save train: ${(error as Error).message}`);
  }
}

/**
 * 複数の列車データを一括保存する
 * @param trainsData 複数の列車データ
 * @returns 保存された列車IDの配列
 */
export async function saveMultipleTrains(
  trainsData: TrainDataWithDiaType[],
): Promise<string[]> {
  if (!trainsData || trainsData.length === 0) {
    throw new Error('No train data provided');
  }

  const normalizedTrainsData: CreateTrainData[] = [];

  for (const [index, data] of trainsData.entries()) {
    try {
      const normalizedData = await normalizeTrainData(data);
      validateTrainData(normalizedData);
      normalizedTrainsData.push(normalizedData);
    } catch (error) {
      throw new Error(`Train data at index ${index} is invalid: ${(error as Error).message}`);
    }
  }

  const savedIds: string[] = [];
  
  // キャッシュ用：ダイヤ種別ごとのDB上のIDをあらかじめ取得しておく
  const diagramIdCache: Record<string, number> = {};

  for (const trainData of trainsData) {
    try {
      let diagramId = trainData.diagramId;

      // もし diagramId が直接指定されていない（diaType文字列しか無い）場合のみ検索する
      if (!diagramId) {
        const diaTypeKey = trainData.diaType || 'weekday';
        if (!diagramIdCache[diaTypeKey]) {
          diagramIdCache[diaTypeKey] = await getDiagramIdForSearch(undefined, diaTypeKey);
        }
        diagramId = diagramIdCache[diaTypeKey];
      }

      // 列車データに正しい diagramId を紐付ける
      const fullTrainData = {
        ...trainData,
        diagramId, 
      };

      // 列車種別のバリデーションと存在チェック
      const trainType = await trainTypesRepository.findTrainTypeByCode(
        fullTrainData.trainTypeCode,
      );
      if (!trainType) {
        throw new Error(`TrainType with code ${fullTrainData.trainTypeCode} not found`);
      }

      // DBへ保存 (これで平日と休日が別の diagramId として保存される)
      const trainId = await trainRepository.createTrain(fullTrainData);
      savedIds.push(trainId);
    } catch (error) {
      console.error(`Failed to save train ${trainData.trainNumber}:`, error);
    }
  }

  return savedIds;
}

async function normalizeTrainData(data: TrainDataWithDiaType): Promise<CreateTrainData> {
  const numericDiagramId = Number(data.diagramId);

  if (Number.isInteger(numericDiagramId) && numericDiagramId > 0) {
    const diagram = await trainRepository.findDiagramById(numericDiagramId);
    if (!diagram) {
      throw new Error(`Diagram with id ${numericDiagramId} not found`);
    }

    return {
      ...data,
      diagramId: numericDiagramId,
    };
  }

  const diaType = data.diaType || 'weekday';
  const diagram =
    (await trainRepository.findDiagramByDiaType(diaType)) ??
    (await trainRepository.createDiagram(diaType));

  return {
    ...data,
    diagramId: diagram.id,
  };
}
/**
 * 列車データのバリデーション
 * @param trainData バリデーション対象のデータ
 * @throws バリデーションエラー
 */
function validateTrainData(data: CreateTrainData): void {
  if (!data.trainNumber) {
    throw new Error('Train number is required');
  }

  if (!data.direction || !['Kudari', 'Nobori'].includes(data.direction)) {
    throw new Error('Direction must be either "Kudari" or "Nobori"');
  }

  if (data.trainTypeCode === undefined || data.trainTypeCode === null) {
    data.trainTypeCode = 0;
  }

  if (!Number.isInteger(data.diagramId) || data.diagramId <= 0) {
    throw new Error('Valid diagramId or diaType is required');
  }

  if (!data.stopTimes || data.stopTimes.length === 0) {
    throw new Error('Train must have at least one stop');
  }

  data.stopTimes.forEach((stop, index) => {
    if (typeof stop.stationId !== 'number' || stop.stationId < 0) {
      throw new Error(`Stop at index ${index}: stationId must be a non-negative number`);
    }

    const hasTimeInfo =
      stop.arrivalMinute !== undefined ||
      stop.departureMinute !== undefined ||
      stop.isPass;
    if (!hasTimeInfo) {
      throw new Error(
        `Stop at index ${index}: must have arrival time, departure time, or be marked as pass`,
      );
    }
  });
}

/**
 * 列車IDで列車データを取得
 * @param trainId 列車ID
 * @returns 列車データ、またはnull
 */
export async function getTrainById(trainId: string) {
  return await trainRepository.getTrainWithStops(trainId);
}

/**
 * 特定のダイヤの列車を取得
 * @returns 列車データの配列
 */
export async function getAllTrains(diagramId: number) {
  return await trainRepository.getAllTrains(diagramId);
}

/**
 * 方向で列車を検索
 * @param direction 進行方向
 * @returns 列車データの配列
 */
export async function getTrainsByDirection(
  diagramId: number,
  direction: 'Kudari' | 'Nobori',
) {
  if (!['Kudari', 'Nobori'].includes(direction)) {
    throw new Error('Direction must be either "Kudari" or "Nobori"');
  }
  return await trainRepository.getTrainsByDirection(diagramId, direction);
}

/**
 * 列車番号で列車を検索
 * @param trainNumber 列車番号
 * @returns 列車データ、またはnull
 */
export async function getDiagramIdForSearch(
  diagramId?: number,
  diaType = 'weekday',
): Promise<number> {
  if (diagramId !== undefined && Number.isInteger(diagramId) && diagramId > 0) {
    const diagram = await trainRepository.findDiagramById(diagramId);
    if (!diagram) {
      throw new Error(`Diagram with id ${diagramId} not found`);
    }
    return diagramId;
  }

  const diagram = await trainRepository.findDiagramByDiaType(diaType);
  if (!diagram) {
    throw new Error(`Diagram with diaType "${diaType}" not found`);
  }

  return diagram.id;
}

export async function getTrainByNumber(diagramId: number, trainNumber: string) {
  return await trainRepository.getTrainByNumber(diagramId, trainNumber);
}
