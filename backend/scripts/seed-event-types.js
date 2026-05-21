require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Updating existing events with types...");

  // Event 1: Music
  await prisma.event.updateMany({
    where: { EventID: 1 },
    data: { EventType: "Live Music" },
  });

  // Event 2: Sports
  await prisma.event.updateMany({
    where: { EventID: 2 },
    data: { EventType: "Sports" },
  });

  // Event 3: Workshop
  await prisma.event.updateMany({
    where: { EventID: 3 },
    data: { EventType: "Courses" },
  });

  // For any others, set to 'Other'
  await prisma.event.updateMany({
    where: { EventType: null },
    data: { EventType: "Other" },
  });

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
