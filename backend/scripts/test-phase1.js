/**
 * Test ALL Phase 1+2+3 APIs
 */
require("dotenv").config();
const prisma = require("../utils/prismaClient");
const BASE = "http://localhost:5000/api";

async function req(method, path, body = null, token = null) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  return { status: res.status, ...data };
}

let passed = 0, failed = 0;
function log(name, r) {
  const ok = r.ok !== false;
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} [${r.status}] ${name}`);
  if (ok) passed++; else { failed++; console.log(`   → ${r.message || JSON.stringify(r).slice(0, 100)}`); }
}

async function main() {
  // Setup: ensure admin user
  let testUser = await prisma.user.findFirst({
    where: { Email: { contains: "admin_test", mode: "insensitive" } },
  });
  if (!testUser) {
    const reg = await req("POST", "/auth/register", {
      FullName: "Admin Test", Email: "admin_test@uticket.com", Password: "12345678",
    });
    testUser = { UserID: reg.user?.userId };
  }
  await prisma.user.update({ where: { UserID: testUser.UserID }, data: { Role: "admin" } });

  // Login
  console.log("══════ AUTH ══════");
  const login = await req("POST", "/auth/login", { email: "admin_test@uticket.com", password: "12345678" });
  const token = login.token;
  log("Login admin", login);
  if (!token) { console.log("ABORT"); return; }

  log("GET /auth/me", await req("GET", "/auth/me", null, token));

  // Profile
  console.log("\n══════ PROFILE ══════");
  log("PUT profile", await req("PUT", "/auth/profile", { FullName: "Admin Tester" }, token));
  log("PUT change-password", await req("PUT", "/auth/change-password", {
    currentPassword: "12345678", newPassword: "12345678"
  }, token));

  // Events CRUD
  console.log("\n══════ EVENTS ══════");
  const ev = await req("POST", "/events", {
    EventName: "Fulltest Concert", Description: "Test", TotalTickets: 200,
    Location: "Ha Noi", EventDate: "2026-07-01T18:00:00Z",
  }, token);
  log("POST event", ev);
  const eid = ev.data?.EventID;

  if (eid) {
    log("GET event", await req("GET", `/events/${eid}`));
    log("PUT event", await req("PUT", `/events/${eid}`, { Location: "HCMC" }, token));

    // TicketTypes
    console.log("\n══════ TICKET TYPES ══════");
    const tt1 = await req("POST", `/events/${eid}/ticket-types`, {
      TypeName: "Standard", Price: 200000, Quantity: 150,
    }, token);
    log("POST ticket-type Standard", tt1);

    const tt2 = await req("POST", `/events/${eid}/ticket-types`, {
      TypeName: "VIP", Price: 500000, Quantity: 50,
    }, token);
    log("POST ticket-type VIP", tt2);

    log("GET ticket-types", await req("GET", `/events/${eid}/ticket-types`));

    if (tt2.data?.TicketTypeID) {
      log("PUT ticket-type", await req("PUT", `/ticket-types/${tt2.data.TicketTypeID}`, { Price: 600000 }, token));
    }

    // Orders
    console.log("\n══════ ORDERS ══════");
    if (tt1.data?.TicketTypeID) {
      const order = await req("POST", "/orders", {
        TicketTypeID: tt1.data.TicketTypeID, Quantity: 2,
      }, token);
      log("POST order (2 tickets)", order);

      log("GET my-orders", await req("GET", "/my-orders", null, token));
      log("GET all orders (admin)", await req("GET", "/orders", null, token));

      if (order.data?.order?.OrderID) {
        log("GET order detail", await req("GET", `/orders/${order.data.order.OrderID}`, null, token));
      }

      // Transfer
      console.log("\n══════ TRANSFER & RESALE ══════");
      const ticketId = order.data?.tickets?.[0]?.TicketID;
      if (ticketId) {
        log("POST transfer", await req("POST", "/tickets/transfer", {
          TicketID: ticketId, ToWallet: "0x1234567890abcdef1234567890abcdef12345678",
        }, token));

        // List for resale (second ticket)
        const ticketId2 = order.data?.tickets?.[1]?.TicketID;
        if (ticketId2) {
          log("POST list-resale", await req("POST", "/tickets/list-resale", {
            TicketID: ticketId2, Price: 250000,
          }, token));

          log("GET resale tickets", await req("GET", "/tickets/resale"));
        }
      }
    }

    // Dashboard
    console.log("\n══════ DASHBOARD ══════");
    log("GET stats", await req("GET", "/dashboard/stats", null, token));
    log("GET sales", await req("GET", "/dashboard/sales?days=30", null, token));
    log("GET event stats", await req("GET", `/dashboard/events/${eid}/stats`, null, token));
    log("GET checkins", await req("GET", "/checkins", null, token));
    log("GET checkin stats", await req("GET", "/checkins/stats", null, token));

    // Users
    console.log("\n══════ USERS ══════");
    log("GET users", await req("GET", "/users", null, token));

    // Cleanup
    console.log("\n══════ CLEANUP ══════");
    // Delete tickets first, then ticket types, then event
    await prisma.ticket.deleteMany({ where: { TicketType: { EventID: eid } } });
    await prisma.order.deleteMany({ where: { Tickets: { none: {} } } });
    log("DELETE event", await req("DELETE", `/events/${eid}`, null, token));
  }

  // Summary
  console.log(`\n${"═".repeat(40)}`);
  console.log(`🏁 TOTAL: ${passed} passed, ${failed} failed out of ${passed + failed}`);

  await prisma.$disconnect();
}

main().catch(e => console.error("ERROR:", e));
