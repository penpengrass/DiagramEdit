import express from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
//expressモジュールを使えるように設定
const { Pool } = require('pg');
//expressモジュールを利用しアプリケーションオブジェクトappを作成
const app = express()
const port = 3000;

// PostgreSQL接続設定
const pool = new Pool({
  user: 'users',
  host: 'host',
  database: 'database',
  password: 'password',
  port: 5432, // デフォルト
});

// サンプルルート
app.get('/test-db', async (req:any, res:any) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json(result.rows);
  } catch (err:any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});