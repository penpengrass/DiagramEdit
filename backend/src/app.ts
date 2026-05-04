import express from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import cors from "cors";
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3000;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL || "" }),
});


// ✅ CORS対応（フロントエンドのポートを許可）
app.use(cors({
  origin: 'http://localhost:5173', // Viteのデフォルトポート（確認してください）
  credentials: true,
}));
// ミドルウェア
app.use(express.json());

// ========== 駅情報 API ==========

// 全駅情報を取得
app.get('/api/stations', async (req: any, res: any) => {
  try {
    const stations = await prisma.station.findMany();
    res.json(stations);
  } catch (err:any) {
    console.error("Error fetching stations:", err);
    res.status(500).json({ error: err.message });
  }
});

// 特定の駅情報を取得
app.get('/api/stations/:id', async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: '無効なID形式です' });
    }
    const station = await prisma.station.findUnique({
      where: { id: id },
    });
    if (!station) {
      return res.status(404).json({ error: '駅が見つかりません' });
    }
    res.json(station);
  } catch (err:any) {
    res.status(500).json({ error: err.message });
  }
});

// 駅情報をDBに追加/更新（JSONファイルまたはフロントからのデータ）
app.post('/api/stations/import', async (req: any, res: any) => {
  try {
    const stations = req.body; // フロントから受け取った駅情報配列
    if (!Array.isArray(stations)) {
      return res.status(400).json({ error: '駅データの配列が必要です' });
    }

    for (const station of stations) {
      console.log(`Processing stations: ID=${station.id}, Name=${station.name}`);
      console.log("Attempting to upsert:", JSON.stringify(station, null, 2));
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
    }

    res.json({ message: 'インポート成功', count: stations.length });
  } catch (err:any) {
    res.status(500).json({ error: err.message });
  }
});

// 駅情報を削除
app.delete('/api/stations/:id', async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: '無効なID形式です' });
    }
    await prisma.station.delete({
      where: { id: id },
    });
    res.json({ message: '削除成功' });
  } catch (err:any) {
    res.status(500).json({ error: err.message });
  }
});

// ========== サーバー起動 ==========
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Gracefulシャットダウン
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down server...");
  await prisma.$disconnect();
  process.exit(0);
});