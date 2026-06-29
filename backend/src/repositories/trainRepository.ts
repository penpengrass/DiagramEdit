import { getPrismaClient } from "../config/database.js";
import type { CreateTrainData } from '@shared/types/timetable';

/**
 * Repository層：列車関連のDB操作（CRUD）のみを担当
 */

function formatOuterTimeValue(value?: number): string {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

function buildOuterTimeCreateData(
  entries: CreateTrainData['outerdep'] | CreateTrainData['outerarrive'] | undefined,
  diagram: number,
  directionType: 'DEP' | 'ARR',
  isNobori: boolean,
  totalStationCount: number
) {
  if (!entries || entries.length === 0) {
    return [];
  }

  return entries.map((entry) => {
    let correctedBoundaryStationId = entry.pointStationID;

    if (isNobori) {
      correctedBoundaryStationId = totalStationCount - entry.pointStationID - 1;
    }

    return {
      directionType,
      outerTerminal: {
        connectOrCreate: {
          where: { id: entry.terminalStationID },
          create: {
            station_id: correctedBoundaryStationId,
            name: "路線外駅 " + entry.terminalStationID,
            //jikoku: "路線外駅",
            //diaryaku: "外",
          }
        }
      },
      boundaryStation: {
        connect: { id: correctedBoundaryStationId },
      },
      terminalTime: formatOuterTimeValue(entry.terminalTime),
      boundaryTime: formatOuterTimeValue(entry.pointTime),
    };
  });
}

export async function findDiagramByDiaType(diaType: string) {
  const prisma = getPrismaClient();
  return await prisma.diagram.findFirst({
    where: { diaType },
    orderBy: { id: 'asc' },
  });
}

export async function findDiagramById(diagramId: number) {
  const prisma = getPrismaClient();
  return await prisma.diagram.findUnique({
    where: { id: diagramId },
  });
}

export async function createDiagram(diaType: string) {
  const prisma = getPrismaClient();
  return await prisma.diagram.create({
    data: {
      name: diaType === 'holiday' ? '休日ダイヤ' : '平日ダイヤ',
      diaType,
    },
  });
}

/**
 * 1本の列車とその各駅の時刻情報をDBに保存する
 * @param trainData DB保存用の列車データ
 * @returns 保存された列車のID
 */
export async function createTrain(trainData: CreateTrainData): Promise<string> {
  const prisma = getPrismaClient();
  const totalStationCount = await prisma.station.count();
  // もしお使いのデータの仕様で dir = 0 が上りなら、判定を == 0 に変更してください。
  const isNobori = trainData.direction == 'Nobori'
  //const diagram = trainData.diagramId || await getDiagramIdForSearch(trainData.diagramId, trainData.diaType);
  const existingTrain = await prisma.train.findFirst({
    where: {
      trainNumber: trainData.trainNumber,
      diagramId: trainData.diagramId,
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
 console.log(`[Repository] 保存実行中... 列車番号: ${trainData.trainNumber}`);
  const newTrain = await prisma.train.create({
    data: {
      trainNumber: trainData.trainNumber,
      trainName: trainData.trainName ?? null,
      direction: trainData.direction,
      diagram: {
        connect: { id: trainData.diagramId },
      },
      trainType: {
        connect: { code: trainData.trainTypeCode },
      },
      stopTimes: {
        create: trainData.stopTimes.map((stop) => ({
          station: {
            connect: { id: stop.stationId },
          },
          arrivalMinute: stop.arrivalMinute ?? null,
          departureMinute: stop.departureMinute ?? null,
          trackName: stop.trackName ?? null,
          isPass: stop.isPass ?? false,
        })),
      },
      outerTimes: {
        create: [
          ...buildOuterTimeCreateData(trainData.outerdep, trainData.diagramId, 'DEP', isNobori, totalStationCount),
          ...buildOuterTimeCreateData(trainData.outerarrive, trainData.diagramId, 'ARR', isNobori, totalStationCount),
        ],
      },
    },
  });
  console.log(`[Repository] 保存完了。 確定したレコードID: ${newTrain.id}`);

  return newTrain.id;
}

/**
 * 列車IDで列車データを取得
 */
export async function getTrainWithStops(trainId: string) {
  const prisma = getPrismaClient();
  return await prisma.train.findUnique({
    where: { id: trainId },
    include: {
      trainType: true,
      stopTimes: {
        include: { station: true },
        orderBy: { stationId: 'asc' },
      },
    },
  });
}

/**
 * あるダイヤの全ての列車を取得
 */
export async function getAllTrains(diagramId: number) {
  const prisma = getPrismaClient();
  return await prisma.train.findMany({
    where: { diagramId },
    include: {
      trainType: true,
      stopTimes: {
        include: { station: true },
      },
    },
  });
}

/**
 * 特定の方向の列車を取得
 */
export async function getTrainsByDirection(diagramId: number, direction: 'Kudari' | 'Nobori') {
  const prisma = getPrismaClient();
  return await prisma.train.findMany({
    where: { diagramId, direction },
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
export async function getTrainByNumber(diagramId: number, trainNumber: string) {
  const prisma = getPrismaClient();
  return await prisma.train.findFirst({
    where: { diagramId, trainNumber },
    include: {
      trainType: true,
      stopTimes: {
        include: { station: true },
        orderBy: { stationId: 'asc' },
      },
      diagram: true,
    },
  });
}
