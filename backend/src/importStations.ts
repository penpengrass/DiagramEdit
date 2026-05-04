import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 外部から呼び出せるようにエクスポート
export async function importStations(prismaClient?: PrismaClient) {
  const prisma = prismaClient || new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL || "" }),
  }) as any;

  try {
    const dataPath = path.join(__dirname, "../stations.json");
    
    if (!fs.existsSync(dataPath)) {
      console.warn(`⚠️  stations.json not found at ${dataPath}`);
      return;
    }

    const data = fs.readFileSync(dataPath, "utf-8");
    const stations = JSON.parse(data);

    for (const station of stations) {
      try {
        console.log(`Processing station: ID=${station.id}, Name=${station.name}`);
        await prisma.station.upsert({
          where: { id: station.id },
          update: {
            name: station.name,
            layout: station.layout,
            main: station.main,
            railnumber: station.railnumber,
            outerterminal: station.outerterminal,
          },
          create: {
            id: station.id,
            name: station.name,
            layout: station.layout,
            main: station.main,
            railnumber: station.railnumber,
            outerterminal: station.outerterminal,
          },
        });
        console.log(`✅ Station ${station.id} imported successfully`);
      } catch (err: any) {
        console.error(`❌ Failed to import station ${station.id}:`, {
          code: err.code,
          message: err.message,
          meta: err.meta,
          modelName: err.meta?.modelName,
          cause: err.meta?.cause,
        });
        throw err;
      }
    }
    console.log(`✅ Import successful: ${stations.length} stations imported`);
  } catch (e: any) {
    console.error("❌ Import failed:", e.message || e);
  } finally {
    // 外部から渡されたprismaClientの場合は切断しない
    if (!prismaClient) {
      await prisma.$disconnect();
    }
  }
}

// スクリプト単体で実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  importStations();
}