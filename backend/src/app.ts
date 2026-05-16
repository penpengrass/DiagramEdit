import express from "express";
import cors from "cors";
import 'dotenv/config';
import stationRouter from "./controllers/stationController.js";

/**
 * Express アプリケーションの初期化とミドルウェア設定
 */
const app = express();

// CORS 対応（フロントエンドのポートを許可）
app.use(cors({
  origin: 'http://localhost:5173', // Viteのデフォルトポート
  credentials: true,
}));

// ミドルウェア
// ペイロード制限を拡大（大きなOUDファイルをサポート）
app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ limit: '1000mb', extended: true }));

// ルートパスへのリクエスト
app.get("/", (req: any, res: any) => {
  res.send("Server is running");
});

// テスト用シンプルエンドポイント
app.get("/test", (req: any, res: any) => {
  res.json({ 
    message: "Test endpoint works!", 
    timestamp: new Date().toISOString() 
  });
});

// 駅情報 API ルート
app.use("/api/stations", stationRouter);

export default app;