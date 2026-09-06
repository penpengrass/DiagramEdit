import { parseOud } from "@shared/parsers/oudParser";
import { findAllTrainTypes } from "../repositories/trainTypesRepository.js";
import * as trainTypesRepository from "../repositories/trainTypesRepository.js";
import path from "path";
import fs from "fs";
/**
 * Note: TrainType is not exported from @prisma/client yet (schema needs regeneration).
 * Using 'any' as a workaround. When Prisma is properly regenerated, replace with:
 * import type { TrainType } from "@prisma/client";
 */
type TrainType = any;
type TrainTypesRepository = {
  findAllTrainTypes: () => Promise<TrainType[]>;
  findTrainTypeByCode: (code: number) => Promise<TrainType | null>;
  upsertMultipleTrainTypes: (trainTypes: any[]) => Promise<TrainType[]>;
};
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
): Promise<TrainType[]> {

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
        const saved = await (oudData.TrainType as any).trainType.upsert({
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
export async function getAllTrainTypes(): Promise<TrainType[]> {
  return findAllTrainTypes();
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
  forceImport: boolean = false,
  repository: TrainTypesRepository = trainTypesRepository
): Promise<void> {
  try {
    // DBに既存データがある場合はスキップ
    if (!forceImport) {
      const existingTrainTypes = await repository.findAllTrainTypes();
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
    await saveTrainTypesService(trainTypes, repository);
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
  repository: TrainTypesRepository = trainTypesRepository
): Promise<void> {
  for (const trainType of trainTypes) {
    try {
      console.log(`Processing train type: code=${trainType.code}, name=${trainType.name}`);
      await repository.upsertMultipleTrainTypes([trainType])
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
 */
export async function getTrainTypeByCode(
  code: number,
  repository: TrainTypesRepository = trainTypesRepository
): Promise<TrainType | null> {
  return repository.findTrainTypeByCode(code);
}

/**
 * フロントエンドから送られた列車種別の配列を直接 DB に保存するサービス
 * @param trainTypes - 列車種別オブジェクトの配列
 * @returns 保存された列車種別のリスト
 */
export async function saveTrainTypesService(
  trainTypes: any[],
  repository: TrainTypesRepository = trainTypesRepository
): Promise<TrainType[]> {
  if (!trainTypes || trainTypes.length === 0) {
    console.warn("⚠️  No train types to save");
    return [];
  }

  console.log(`📊 Saving ${trainTypes.length} train types to database...`);

  const savedTrainTypes: TrainType[] = [];

  // for...of から 通常のforループ（または map / forEach）に変更し、インデックスを使用する
  const normalizedTrainTypes = trainTypes.map((trainType, i) => {
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
    return {
      code,
      name: trainType.name,
      shortName: trainType.shortName ?? trainType.ryakushou ?? "",
      color: trainType.color || "00000000",
    };
    });

  console.log(`✅ Successfully saved ${savedTrainTypes.length} train types`);
  return repository.upsertMultipleTrainTypes(normalizedTrainTypes);
}
