-- CreateTable
CREATE TABLE "stations" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "layout" TEXT NOT NULL,
    "main" TEXT NOT NULL,
    "railnumber" JSONB NOT NULL,
    "outerterminal" JSONB NOT NULL,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainType" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RailNumber" (
    "id" SERIAL NOT NULL,
    "station_id" INTEGER NOT NULL,
    "rail_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "ryakushou" TEXT NOT NULL,

    CONSTRAINT "RailNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OuterTerminal" (
    "id" SERIAL NOT NULL,
    "station_id" INTEGER NOT NULL,
    "terminal_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "jikoku" TEXT NOT NULL,
    "diaryaku" TEXT NOT NULL,

    CONSTRAINT "OuterTerminal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainType_code_key" ON "TrainType"("code");
