//ここにPrismaClientは書かない。
import * as trainRepository from '../repositories/trainRepository.js';
import type { CreateTrainData } from '@shared/types/types';

/**
 * Service層：列車データのビジネスロジックを担当
 */

/**
 * 単一の列車データをDB保存する
 * @param trainData DB保存用の列車データ
 * @returns 保存された列車ID
 * @throws 列車種別が見つからない場合など
 */
export async function saveTrain(trainData: CreateTrainData): Promise<string> {
  // バリデーション
  validateTrainData(trainData);

  try {
    return await trainRepository.createTrain(trainData);
  } catch (error) {
    throw new Error(`Failed to save train: ${(error as Error).message}`);
  }
}

/**
 * 複数の列車データを一括保存する
 * @param trainsData 複数の列車データ
 * @returns 保存された列車IDの配列
 */
export async function saveMultipleTrains(trainsData: CreateTrainData[]): Promise<string[]> {
  if (!trainsData || trainsData.length === 0) {
    throw new Error('No train data provided');
  }

  // 各データをバリデーション
  trainsData.forEach((data, index) => {
    try {
      validateTrainData(data);
    } catch (error) {
      throw new Error(`Train data at index ${index} is invalid: ${(error as Error).message}`);
    }
  });

  try {
    return await trainRepository.createMultipleTrains(trainsData);
  } catch (error) {
    throw new Error(`Failed to save trains: ${(error as Error).message}`);
  }
}

/**
 * 列車データのバリデーション
 * @param trainData バリデーション対象のデータ
 * @throws バリデーションエラー
 */
function validateTrainData(trainData: CreateTrainData): void {
  // 列車番号の確認
  if (!trainData.trainNumber || trainData.trainNumber.trim() === '') {
    throw new Error('Train number is required');
  }

  // 進行方向の確認
  if (!['Kudari', 'Nobori'].includes(trainData.direction)) {
    throw new Error('Direction must be either "Kudari" or "Nobori"');
  }

  // routeId の確認
  /*if (typeof trainData.routeId !== 'number' || isNaN(trainData.routeId)) {
    throw new Error('routeId must be provided as a number');
  }*/

  // 列車種別コードの確認
  if (typeof trainData.trainTypeCode !== 'number' || trainData.trainTypeCode < 0) {
    throw new Error('Train type code must be a non-negative number');
  }

  // 停車駅情報の確認
  if (!Array.isArray(trainData.stopTimes) || trainData.stopTimes.length === 0) {
    throw new Error('At least one stop time entry is required');
  }

  // 各停車駅データをバリデーション
  trainData.stopTimes.forEach((stop, index) => {
    if (typeof stop.stationId !== 'number' || stop.stationId < 0) {
      throw new Error(`Stop at index ${index}: stationId must be a non-negative number`);
    }

    const hasTimeInfo =
      stop.arrivalMinute !== undefined ||
      stop.departureMinute !== undefined ||
      stop.isPass;
    if (!hasTimeInfo) {
      throw new Error(`Stop at index ${index}: must have arrival time, departure time, or be marked as pass`);
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
 * 全列車を取得
 * @returns 列車データの配列
 */
export async function getAllTrains() {
  return await trainRepository.getAllTrains();
}

/**
 * 方向で列車を検索
 * @param direction 進行方向
 * @returns 列車データの配列
 */
export async function getTrainsByDirection(direction: 'Kudari' | 'Nobori') {
  if (!['Kudari', 'Nobori'].includes(direction)) {
    throw new Error('Direction must be either "Kudari" or "Nobori"');
  }
  return await trainRepository.getTrainsByDirection(direction);
}

/**
 * 列車番号で列車を検索
 * @param trainNumber 列車番号
 * @returns 列車データ、またはnull
 */
export async function getTrainByNumber(trainNumber: string) {
  if (!trainNumber || trainNumber.trim() === '') {
    throw new Error('Train number must be provided');
  }
  return await trainRepository.getTrainByNumber(trainNumber);
}
