import { getPrismaClient } from "../config/database.js";
import type { CreateTrainData } from '@shared/types/timetable';
import { toDbId, getCorrectedBoundaryId } from "../utils/idConverter.js";
/**
 * Repository層：列車関連のDB操作（CRUD）のみを担当
 */

function formatOuterTimeValue(value?: number): string {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

async function buildOuterTimeCreateData(
  entries: CreateTrainData['outerdep'] | CreateTrainData['outerarrive'] | undefined,
  diagram: number,
  directionType: 'DEP' | 'ARR',
  isNobori: boolean,
  totalStationCount: number,
  trainNumber: string
): Promise<any[]> {
  if (!entries || entries.length === 0) {
    return [];
  }
  const prisma = getPrismaClient();
  const createDataList = [];

  for (const entry of entries) {
    //idの採番方法を共通関数にする。
    const correctedBoundaryStationId = getCorrectedBoundaryId(
      entry.pointStationID,
      isNobori,
      totalStationCount
    );
    const targetId = toDbId(entry.terminalStationID);
    const isMasterExist = await prisma.outerTerminalStation.findUnique({
      where: {
        station_id_terminal_id: {
          station_id: correctedBoundaryStationId,
          terminal_id: targetId,
        },
      },
    });

    if (!isMasterExist) {
      console.error(`\n🚨 [OuterTime データ不整合検知] ---------------------------------`);
      console.error(`| 列車番号: ${trainNumber} (${directionType === 'DEP' ? '路線外発' : '路線外着'})`);
      console.error(`| 理由: 登録しようとした OuterTime が、存在しない OuterTerminalStation (ID: ${entry.terminalStationID}) を参照しています。`);
      console.error(`|`);
      console.error(`| < エラーが発生する OuterTime の想定登録内容 >`);
      console.error(`|   - directionType (発着区分): ${directionType}`);
      console.error(`|   - terminalStationID (指定された路線外駅ID): ${entry.terminalStationID} 👈 これがマスタにありません`);
      console.error(`|   - pointStationID (下りの境界駅ID(上りでは無視)): ${entry.pointStationID}`);
      console.error(`|   - correctedBoundaryStationId (上りの境界駅ID(下りでは無視)): ${correctedBoundaryStationId}`);
      console.error(`|   - terminalTime (路線外の時刻): ${formatOuterTimeValue(entry.terminalTime)}`);
      console.error(`|   - pointTime (境界駅の時刻): ${formatOuterTimeValue(entry.pointTime)}`);
      console.error(`| -------------------------------------------------------------------\n`);

      // クラッシュを避けるため、この不正なレコードの作成処理だけをスキップして次のデータの処理へ進む
      continue;
    }

    // 確定したオブジェクトを配列に詰める
    createDataList.push({
      directionType,
      /*outerTerminal: {
        connect: { id: isMasterExist.id },
      },*/
      outerTerminalId: targetId,
      boundaryStation: {
        connect: { id: correctedBoundaryStationId },
      },
      terminalTime: formatOuterTimeValue(entry.terminalTime),
      boundaryTime: formatOuterTimeValue(entry.pointTime),
    });
    //console.log(`| 列車番号: ${trainNumber}`);
  }
  return createDataList;
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
  // ループ外でデータを参照できるように、スコープを try の外側に定義しておきます
  let outerDepData: any[] = [];
  let outerArriveData: any[] = [];
  try {
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
    //console.log(`[Repository] 保存実行中... 列車番号: ${trainData.trainNumber}`);
    // データの事前生成（ここでIDの計算が行われます）
    outerDepData = await buildOuterTimeCreateData(trainData.outerdep, trainData.diagramId, 'DEP', isNobori, totalStationCount, trainData.trainNumber);
    outerArriveData = await buildOuterTimeCreateData(trainData.outerarrive, trainData.diagramId, 'ARR', isNobori, totalStationCount, trainData.trainNumber);
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
              connect: { id: toDbId(stop.stationId) },
            },
            arrivalMinute: stop.arrivalMinute ?? null,
            departureMinute: stop.departureMinute ?? null,
            trackName: stop.trackName ?? null,
            isPass: stop.isPass ?? false,
          })),
        },
        outerTimes: {
          create: [
            ...outerDepData,
            ...outerArriveData,],
        },
      },
    });
    //console.log(`[Repository] 保存完了。 確定したレコードID: ${newTrain.id}`);

    return newTrain.id;
  } catch (error: any) {
    // 🚨 ログを大幅強化：衝突した「具体的なIDの数値」を暴き出します
    console.error(`\n❌ ==================== [インポートクラッシュ] ====================`);
    console.error(`| 列車番号: ${trainData.trainNumber}`);
    console.error(`| エラー内容: ${error.message}`);

    // Prismaの一意制約エラー（P2002）のメタデータがあれば出力
    if (error.code === 'P2002' && error.meta?.target) {
      console.error(`| 衝突した制約カラム: ${JSON.stringify(error.meta.target)}`);
    }

    //console.error(`| ----------------------------------------------------------------`);
    //console.error(`| [調査データ] この列車がDBに登録しようとした、路線外発着の全組み合わせ:`);

    // 出発側（DEP）の数値をログ出力
    outerDepData.forEach((d: any, idx: number) => {
      console.error(
        `|   [DEP #${idx + 1}] station_id (境界駅): ${d.boundaryStation.connect.id}, ` //+
        //`terminal_id (路線外駅): ${d.outerTerminal.connect.where.id} ` +
        //  `(マスタ不在時の登録値: ${d.outerTerminal.connect.create.terminal_id})`
      );
    });

    // 到着側（ARR）の数値をログ出力
    outerArriveData.forEach((a: any, idx: number) => {
      console.error(
        `|   [ARR #${idx + 1}] station_id (境界駅): ${a.boundaryStation.connect.id}, ` //+
        //`terminal_id (路線外駅): ${a.outerTerminal.connect.where.id} ` +
        //  `(マスタ不在時の登録値: ${a.outerTerminal.connect.create.terminal_id})`
      );
    });
    console.error(`==================================================================\n`);

    throw error;
  }
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
      outerTimes: true,
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
      outerTimes: true,
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
      outerTimes: true,
      diagram: true,
    },
  });
}
