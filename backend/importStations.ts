import express from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL || "" }),
}) as any;

async function main() {
  const data = fs.readFileSync(path.join(__dirname, 'stations.json'), 'utf-8');
  const stations = JSON.parse(data);

  for (const station of stations) {
    await prisma.station.upsert({
      where: { id: station.id },
      update: {
        name: station.name,
        layout: station.layout,
        main: station.main,
        railnumber: station.railnumber,
        OuterTerminal: station.OuterTerminal,
      },
      create: {
        id: station.id,
        name: station.name,
        layout: station.layout,
        main: station.main,
        railnumber: station.railnumber,
        OuterTerminal: station.OuterTerminal,
      },
    });
  }
  console.log('Import successful');
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });