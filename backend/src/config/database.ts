import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import 'dotenv/config';

let prisma: PrismaClient | null = null;

/**
 * Prismaクライアントを初期化して返す
 * 既に初期化されている場合は既存のインスタンスを返す
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ 
        connectionString: process.env.DATABASE_URL || "" 
      }),
    }) as PrismaClient;
  }
  return prisma;
}

/**
 * Prismaクライアントを明示的に初期化する
 */
export function initPrisma(): PrismaClient {
  return getPrismaClient();
}

/**
 * Prismaクライアントの接続をテストする
 */
export async function testDatabaseConnection(): Promise<void> {
  const prisma = getPrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection verified");
  } catch (err: any) {
    console.error("❌ Failed to connect to database:", err.message);
    throw err;
  }
}

/**
 * Prismaクライアントを切断する
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}