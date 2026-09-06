import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseOud } from "./oudParser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * oud2ファイルから列車種別情報を抽出してJSONファイルを生成
 * 使用方法: npx ts-node src/scripts/generateTrainTypesJson.ts <oud2ファイルパス>
 */
async function generateTrainTypesJson(oudFilePath: string): Promise<void> {
  try {
    if (!fs.existsSync(oudFilePath)) {
      console.error(`❌ OUD file not found: ${oudFilePath}`);
      process.exit(1);
    }

    const fileName = path.basename(oudFilePath);
    console.log(`📂 Reading OUD file: ${fileName}`);
    
    const content = fs.readFileSync(oudFilePath, "utf-8");
    const oudData = parseOud(content, fileName);

    if (oudData.TrainType.length === 0) {
      console.warn("⚠️  No train types found in OUD file");
      return;
    }

    // Prismaスキーマの形式に合わせて変換
    const trainTypesForDb = oudData.TrainType.map((trainType) => ({
      code: trainType.id,
      name: trainType.name,
      shortName: trainType.ryakushou,
      color: trainType.color, // Already has "#" prefix from addTrainType
    }));

    // trainTypes.jsonのパスを定義
    const outputPath = path.join(
      __dirname,
      "../../../backend/prisma/seeds/trainTypes.json"
    );

    // JSONファイルに書き込み
    fs.writeFileSync(
      outputPath,
      JSON.stringify(trainTypesForDb, null, 2),
      "utf-8"
    );

    console.log(`✅ Successfully generated trainTypes.json`);
    console.log(`📊 Found ${trainTypesForDb.length} train types:`);
    trainTypesForDb.forEach((tt) => {
      console.log(`   - [${tt.code}] ${tt.name} (${tt.shortName}) - ${tt.color}`);
    });
    console.log(`📁 Saved to: ${outputPath}`);
  } catch (err: any) {
    console.error("❌ Error generating train types JSON:", err.message || err);
    process.exit(1);
  }
}

// コマンドライン引数からoud2ファイルパスを取得
const oudFilePath = process.argv[2];

if (!oudFilePath) {
  console.error("❌ Please provide OUD file path");
  console.log(
    "Usage: npx ts-node src/scripts/generateTrainTypesJson.ts <oud2ファイルパス>"
  );
  process.exit(1);
}

generateTrainTypesJson(oudFilePath);
