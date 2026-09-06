// backend/src/repositories/trainTypesRepository.ts
import { getPrismaClient } from "../config/database.js";

export type TrainTypeInput = {
    code: number;
    name: string;
    shortName: string;
    color?: string | null;
};

export async function findAllTrainTypes() {
    const prisma = getPrismaClient();

    return prisma.trainType.findMany({
        orderBy: { code: "asc" },
    });
}

export async function findTrainTypeByCode(code: number) {
    const prisma = getPrismaClient();

    return prisma.trainType.findUnique({
        where: { code },
    });
}

export async function upsertTrainType(trainType: TrainTypeInput) {
    const prisma = getPrismaClient();

    return prisma.trainType.upsert({
        where: { code: trainType.code },
        update: {
            name: trainType.name,
            shortName: trainType.shortName,
            color: trainType.color ?? "",
        },
        create: {
            code: trainType.code,
            name: trainType.name,
            shortName: trainType.shortName,
            color: trainType.color ?? "",
        },
    });
}

export async function upsertMultipleTrainTypes(trainTypes: TrainTypeInput[]) {
    const savedTrainTypes = [];

    for (const trainType of trainTypes) {
        const saved = await upsertTrainType(trainType);
        savedTrainTypes.push(saved);
    }

    return savedTrainTypes;
}