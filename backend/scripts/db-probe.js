require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const info = await prisma.$queryRawUnsafe(
    "select current_database() as db, current_user as usr, inet_server_addr()::text as host, inet_server_port() as port"
  );
  const ticketCount = await prisma.ticket.count();
  const sample = await prisma.ticket.findMany({
    take: 5,
    orderBy: { TicketID: "desc" },
    select: { TicketID: true, TokenID: true, TransactionHash: true, OwnerWallet: true },
  });

  console.log("DB_INFO", JSON.stringify(info, null, 2));
  console.log("TICKET_COUNT", ticketCount);
  console.log("LATEST_TICKETS", JSON.stringify(sample, null, 2));
}

main()
  .catch((e) => {
    console.error("DB_PROBE_ERROR", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
