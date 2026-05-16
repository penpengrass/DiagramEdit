import { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "../config/database.js";
import { parseOud } from "@shared/parsers/oudParser";
import path from "path";
import fs from "fs";
/**
 * Note: TrainType is not exported from @prisma/client yet (schema needs regeneration).
 * Using 'any' as a workaround. When Prisma is properly regenerated, replace with:
 * import type { TrainType } from "@prisma/client";
 */
type TrainType = any;

/**
 * ビジネスロジック層：列車種別のビジネスロジック処理
 */

/**
 * OUDファイルから列車種別を抽出してDBに保存するサービス
 * @param fileContent - OUDファイルの内容（テキスト）
 * @param fileName - ファイル名
 * @param prisma - Prismaクライアント（オプション）
 * @returns 保存された列車種別のリスト
 */
export async function importTrainTypesFromOudService(
  fileContent: string,
  fileName: string,
  prisma?: PrismaClient
): Promise<TrainType[]> {
  const client = prisma || getPrismaClient();

  try {
    // OUDファイルを解析
    console.log("📂 Parsing OUD file for train types...");
    const oudData = parseOud(fileContent, fileName);

    if (!oudData.TrainType || oudData.TrainType.length === 0) {
      console.warn("⚠️  No train types found in OUD file");
      return [];
    }

    console.log(`📊 Found ${oudData.TrainType.length} train types`);

    // 列車種別をDBに保存
    const savedTrainTypes: TrainType[] = [];

    for (const trainType of oudData.TrainType) {
      try {
        const saved = await (client as any).trainType.upsert({
          where: { code: trainType.id },
          update: {
            name: trainType.name,
            shortName: trainType.ryakushou,
            color: trainType.color,
          },
          create: {
            code: trainType.id,
            name: trainType.name,
            shortName: trainType.ryakushou,
            color: trainType.color,
          },
        });
        savedTrainTypes.push(saved);
        console.log(`✅ Train type [${trainType.id}] ${trainType.name} saved`);
      } catch (err: any) {
        console.error(`❌ Failed to save train type [${trainType.id}]:`, err.message);
        throw err;
      }
    }

    console.log(`✅ Successfully saved ${savedTrainTypes.length} train types`);
    return savedTrainTypes;
  } catch (e: any) {
    console.error("❌ Error importing train types from OUD:", e.message || e);
    throw e;
  }
}

/**
 * 全ての列車種別を取得するサービス
 * @param prisma - Prismaクライアント（オプション）
 */
export async function getAllTrainTypes(prisma?: PrismaClient): Promise<TrainType[]> {
  const client = prisma || getPrismaClient();
  return (client as any).trainType.findMany({
    orderBy: { code: "asc" },
  });
}
/**
 * trainTypes.json から列車種別を読み込む
 */
function loadTrainTypesFromJson(dataPath: string): any[] {
  if (!fs.existsSync(dataPath)) {
    console.warn(`⚠️  trainTypes.json not found at ${dataPath}`);
    return [];
  }

  const data = fs.readFileSync(dataPath, "utf-8");
  return JSON.parse(data);
}
/**
 * trainTypes.json をインポート
 * @param prismaClient - 外部から渡されたPrismaクライアント（オプション）
 * @param forceImport - 強制的にインポートするかどうか（デフォルト: false）
 */
export async function importTrainTypes(
  prismaClient: any,
  forceImport: boolean = false
): Promise<void> {
  if (!prismaClient) {
    throw new Error("importTrainTypes requires a Prisma client passed as the first argument");
  }
  const prisma = prismaClient;

  try {
    // DBに既存データがある場合はスキップ
    if (!forceImport) {
      const existingTrainTypes = await prisma.trainType.findMany();
      if (existingTrainTypes.length > 0) {
        console.log(
          `✅ Database already contains ${existingTrainTypes.length} train types. Skipping import.`
        );
        return;
      }
    }

    const dataPath = path.join(__dirname, "../../../backend/prisma/seeds/trainTypes.json");
    console.log("📂 Loading train types from JSON...");

    const trainTypes = loadTrainTypesFromJson(dataPath);

    if (trainTypes.length === 0) {
      console.warn("⚠️  No train types to import");
      return;
    }

    console.log(`📊 Found ${trainTypes.length} train types to import`);
    await importTrainTypesToDatabase(trainTypes, prisma);
    console.log(`✅ Import successful: ${trainTypes.length} train types imported`);
  } catch (e: any) {
    console.error("❌ Import failed:", e.message || e);
  } finally {
    // Do not disconnect the client here. Caller manages lifecycle.
  }
}
/**
 * 列車種別情報を DB にインポート
 */
export async function importTrainTypesToDatabase(
  trainTypes: any[],
  prisma: any
): Promise<void> {
  for (const trainType of trainTypes) {
    try {
      console.log(`Processing train type: code=${trainType.code}, name=${trainType.name}`);
      await prisma.trainType.upsert({
        where: { code: trainType.code },
        update: {
          name: trainType.name,
          shortName: trainType.shortName,
          color: trainType.color,
        },
        create: {
          code: trainType.code,
          name: trainType.name,
          shortName: trainType.shortName,
          color: trainType.color,
        },
      });
      console.log(`✅ Train type ${trainType.code} imported successfully`);
    } catch (err: any) {
      console.error(`❌ Failed to import train type ${trainType.code}:`, {
        code: err.code,
        message: err.message,
        meta: err.meta,
      });
      throw err;
    }
  }
}
/**
 * 特定のコードの列車種別を取得するサービス
 * @param code - 列車種別コード
 * @param prisma - Prismaクライアント（オプション）
 */
export async function getTrainTypeByCode(
  code: number,
  prisma?: PrismaClient
): Promise<TrainType | null> {
  const client = prisma || getPrismaClient();
  return (client as any).trainType.findUnique({
    where: { code },
  });
}

/**
 * フロントエンドから送られた列車種別の配列を直接 DB に保存するサービス
 * @param trainTypes - 列車種別オブジェクトの配列
 * @param prisma - Prismaクライアント（オプション）
 * @returns 保存された列車種別のリスト
 */
export async function saveTrainTypesService(
  trainTypes: any[],
  prisma?: PrismaClient
): Promise<TrainType[]> {
  const client = prisma || getPrismaClient();

  try {
    if (!trainTypes || trainTypes.length === 0) {
      console.warn("⚠️  No train types to save");
      return [];
    }

    console.log(`📊 Saving ${trainTypes.length} train types to database...`);

    const savedTrainTypes: TrainType[] = [];

    // for...of から 通常のforループ（または map / forEach）に変更し、インデックスを使用する
    for (let i = 0; i < trainTypes.length; i++) {
      const trainType = trainTypes[i];
      try {
        // 文字列の 'undefined' や空文字、欠落など、有効な数値ではないパターンをすべて弾く
        let code: number;

        if (
          trainType.code === undefined ||
          trainType.code === null ||
          trainType.code === 'undefined' ||
          trainType.code === ''
        ) {
          // 有効なコードがない場合は、配列のインデックス(i)を使用
          code = i;
        } else {
          // 値がある場合は数値に変換
          code = typeof trainType.code === 'string' ? parseInt(trainType.code, 10) : trainType.code;
        }

        // それでも NaN になってしまった場合はインデックス(i)にフォールバックする
        if (isNaN(code)) {
          console.warn(`⚠️ Invalid code format for ${trainType.name}, fallback to index ${i}`);
          code = i;
        }
        const shortName = trainType.shortName ?? trainType.ryakushou ?? '';
        const color = trainType.color || '00000000';

        const saved = await (client as any).trainType.upsert({
          where: { code },
          update: {
            name: trainType.name,
            shortName,
            color,
          },
          create: {
            code,
            name: trainType.name,
            shortName,
            color,
          },
        });
        savedTrainTypes.push(saved);
        console.log(`✅ Train type [${code}] ${trainType.name} saved`);
      } catch (err: any) {
        console.error(`❌ Failed to save train type at index ${i} [${trainType?.code}]:`, err.message);
        throw err;
      }
    }

    console.log(`✅ Successfully saved ${savedTrainTypes.length} train types`);
    return savedTrainTypes;
  } catch (e: any) {
    console.error("❌ Error saving train types:", e.message || e);
    throw e;
  }
}
