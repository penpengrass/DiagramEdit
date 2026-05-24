import { getPrismaClient } from "../config/database.js";
import type { CreateTrainData, TrainStopTimeData } from '@shared/types/types';

/**
 * Repository層：列車関連のDB操作を担当
 */

/**
 * 1本の列車とその各駅の時刻情報をDBに保存する
 * @param trainData DB保存用の列車データ
 * @returns 保存された列車のID
 */
export async function createTrain(trainData: CreateTrainData): Promise<string> {
  const prisma = getPrismaClient();

  // 1. TrainTypeを取得（コードで検索）
  const trainType = await prisma.trainType.findUnique({
    where: { code: trainData.trainTypeCode },
  });

  if (!trainType) {
    throw new Error(`TrainType with code ${trainData.trainTypeCode} not found`);
  }

  // 2. 既存の同じ列車番号・方向の列車を検索して削除
  const existingTrain = await prisma.train.findFirst({
    where: {
      trainNumber: trainData.trainNumber,
      direction: trainData.direction,
    },
  });

  if (existingTrain) {
    // 既存の列車を削除（onDelete: Cascadeで停車時刻情報も自動削除）
    await prisma.train.delete({
      where: { id: existingTrain.id },
    });
  }

  // 3. Train レコードを作成
  const train = await prisma.train.create({
    data: {
      trainNumber: trainData.trainNumber,
      trainName: trainData.trainName || null,
      direction: trainData.direction,
      trainTypeId: trainType.id,
    },
  });

  // 4. TrainStopTime レコードを一括作成
  if (trainData.stopTimes.length > 0) {
    await createTrainStopTimes(train.id, trainData.stopTimes);
  }

  return train.id;
}

/**
 * 複数の列車をまとめて保存する
 * @param trainsData 複数の列車データ
 * @returns 保存された列車IDの配列
 */
export async function createMultipleTrains(trainsData: CreateTrainData[]): Promise<string[]> {
  const trainIds: string[] = [];

  console.log(`\n【開始】${trainsData.length} 件の列車データをインポートします`);

  for (let i = 0; i < trainsData.length; i++) {
    const trainData = trainsData[i];
    if (trainData !== undefined) {
      try {
        console.log(`  [${i + 1}/${trainsData.length}] 列車番号: ${trainData.trainNumber}, 方向: ${trainData.direction}, 停車駅数: ${trainData.stopTimes.length}`);
        const trainId = await createTrain(trainData);
        trainIds.push(trainId);
        console.log(`    ✅ 成功 (ID: ${trainId})`);
      } catch (error: any) {
        console.error(`    ❌ エラー: ${error.message}`);
        throw error;
      }
    }
  }

  console.log(`【完了】${trainIds.length} 件のインポートが完了しました\n`);
  return trainIds;
}

/**
 * 列車の各駅の時刻情報を保存する
 * @param trainId 列車ID
 * @param stopTimes 各駅の時刻情報
 */
async function createTrainStopTimes(
  trainId: string,
  stopTimes: TrainStopTimeData[]
): Promise<void> {
  const prisma = getPrismaClient();

  const stopTimeData = stopTimes.map((stopTime) => ({
    trainId,
    stationId: stopTime.stationId,
    arrivalMinute: stopTime.arrivalMinute ?? null,
    departureMinute: stopTime.departureMinute ?? null,
    trackName: stopTime.trackName ?? null,
    isPass: stopTime.isPass,
  }));
  
  await prisma.trainStopTime.createMany({
    data: stopTimeData,
  });
}

/**
 * 指定した列車IDの列車を取得（停車駅情報を含む）
 * @param trainId 列車ID
 * @returns 列車データ、または null
 */
export async function getTrainWithStops(trainId: string) {
  const prisma = getPrismaClient();

  return await prisma.train.findUnique({
    where: { id: trainId },
    include: {
      trainType: true,
      stopTimes: {
        include: {
          station: true,
        },
        orderBy: {
          stationId: 'asc',
        },
      },
    },
  });
}

/**
 * 全ての列車を取得
 * @returns 列車データの配列
 */
export async function getAllTrains() {
  const prisma = getPrismaClient();

  return await prisma.train.findMany({
    include: {
      trainType: true,
      stopTimes: {
        include: {
          station: true,
        },
      },
    },
  });
}

/**
 * 特定の方向（Kudari/Nobori）の列車を取得
 * @param direction 進行方向
 * @returns 列車データの配列
 */
export async function getTrainsByDirection(direction: 'Kudari' | 'Nobori') {
  const prisma = getPrismaClient();

  return await prisma.train.findMany({
    where: { direction },
    include: {
      trainType: true,
      stopTimes: true,
    },
  });
}

/**
 * 列車番号で列車を検索
 * @param trainNumber 列車番号
 * @returns 列車データ、または null
 */
export async function getTrainByNumber(trainNumber: string) {
  const prisma = getPrismaClient();

  return await prisma.train.findFirst({
    where: { trainNumber },
    include: {
      trainType: true,
      stopTimes: {
        include: {
          station: true,
        },
      },
    },
  });
}
