/**
 * ============================================================
 *  test-system.js — QA Automation Bot v2.0
 *  Kiểm tra: REST API + JWT Auth + Socket.io Real-time
 *  Chạy: node test-system.js  (server phải đang chạy ở port 5000)
 * ============================================================
 */

const { io: socketClient } = require("socket.io-client");

// ─── CẤU HÌNH ────────────────────────────────────────────────────────────────
const BASE_URL   = "http://localhost:5000";
const TEST_WALLET = "0xDb04A3e2d24c904672a5D4CfADDe61EFA0F82430";

// Biến động — bot tự điền trong quá trình chạy
let AUTH_TOKEN       = null;
let DYNAMIC_EVENT_ID = null;
let DYNAMIC_TOKEN_ID = null;

// ─── ANSI COLORS ─────────────────────────────────────────────────────────────
const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  green:  "\x1b[32m",
  red:    "\x1b[31m",
  yellow: "\x1b[33m",
  cyan:   "\x1b[36m",
  magenta:"\x1b[35m",
  gray:   "\x1b[90m",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const pass  = (msg) => console.log(`  ${C.green}✔ PASS${C.reset}  ${msg}`);
const fail  = (msg) => console.log(`  ${C.red}✘ FAIL${C.reset}  ${msg}`);
const info  = (msg) => console.log(`  ${C.gray}${msg}${C.reset}`);
const skip  = (msg) => console.log(`  ${C.yellow}⊘ SKIP${C.reset}  ${msg}`);
const title = (no, label, icon = "🔵") =>
  console.log(`\n${C.cyan}${C.bold}[ Test ${no} ] ${icon} ${label}${C.reset}`);
const section = (label) =>
  console.log(`\n${C.magenta}${C.bold}── ${label} ${"─".repeat(Math.max(0, 45 - label.length))}${C.reset}`);

// ─── HTTP REQUEST (hỗ trợ JWT) ───────────────────────────────────────────────
async function request(method, path, body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  let json = null;
  try { json = await res.json(); } catch (_) {}
  return { status: res.status, json };
}

// ─── KẾT QUẢ TỔNG KẾT ───────────────────────────────────────────────────────
const results = [];
function record(name, passed, detail = "") {
  results.push({ name, passed, detail });
  if (passed) pass(`${name}${detail ? "  " + C.gray + detail + C.reset : ""}`);
  else        fail(`${name}${detail ? "  " + C.gray + detail + C.reset : ""}`);
}

// ════════════════════════════════════════════════════════
//  PHẦN 1: KIỂM TRA REST API (DYNAMIC DATA)
// ════════════════════════════════════════════════════════
async function runRestTests() {
  section("REST API TESTS");

  // ── Test 1: GET /api/events ──────────────────────────────────────────────
  title(1, "GET /api/events  (Danh sách sự kiện)", "📋");
  try {
    const { status, json } = await request("GET", "/api/events");
    info(`Status: ${status}  |  Số sự kiện: ${Array.isArray(json?.data) ? json.data.length : "N/A"}`);
    if (status === 200 && json?.ok && Array.isArray(json?.data) && json.data.length > 0) {
      DYNAMIC_EVENT_ID = json.data[0].EventID;
      record("Danh sách sự kiện trả về mảng hợp lệ", true,
        `${json.data.length} events — tự động lấy EventID: ${DYNAMIC_EVENT_ID}`);
    } else {
      DYNAMIC_EVENT_ID = 1;
      record("Danh sách sự kiện trả về mảng hợp lệ", false, `status=${status} hoặc DB chưa có dữ liệu`);
    }
  } catch (e) { record("Danh sách sự kiện", false, e.message); }

  // ── Test 2: GET /api/events/:id ─────────────────────────────────────────
  title(2, `GET /api/events/${DYNAMIC_EVENT_ID}  (Chi tiết sự kiện)`, "🔍");
  try {
    const { status, json } = await request("GET", `/api/events/${DYNAMIC_EVENT_ID}`);
    info(`Status: ${status}  |  EventName: "${json?.data?.EventName ?? "N/A"}"`);
    if (status === 200 && json?.ok && json?.data?.EventID) {
      record("Chi tiết sự kiện trả về đúng EventID", true, `EventID=${json.data.EventID}`);
    } else {
      record("Chi tiết sự kiện trả về đúng EventID", false, `status=${status} | ${json?.message ?? ""}`);
    }
  } catch (e) { record("Chi tiết sự kiện", false, e.message); }

  // ── Test 3: GET /api/my-tickets?wallet=... ───────────────────────────────
  title(3, "GET /api/my-tickets  (Vé của ví)", "🎟️");
  try {
    const { status, json } = await request("GET", `/api/my-tickets?wallet=${TEST_WALLET}`);
    info(`Status: ${status}  |  Số vé: ${Array.isArray(json?.data) ? json.data.length : "N/A"}`);
    if (status === 200 && json?.ok && Array.isArray(json?.data)) {
      if (json.data.length > 0) {
        DYNAMIC_TOKEN_ID = json.data[0].TokenID;
        record("Danh sách vé của ví trả về mảng", true,
          `${json.data.length} vé — tự động lấy TokenID: ${DYNAMIC_TOKEN_ID}`);
      } else {
        record("Danh sách vé của ví trả về mảng", true, "Ví chưa mua vé nào (mảng rỗng hợp lệ)");
      }
    } else {
      record("Danh sách vé của ví trả về mảng", false, `status=${status}`);
    }
  } catch (e) { record("Danh sách vé của ví", false, e.message); }

  // ── Test 4: GET /api/metadata/:tokenId ──────────────────────────────────
  if (DYNAMIC_TOKEN_ID) {
    title(4, `GET /api/metadata/${DYNAMIC_TOKEN_ID}  (NFT ERC-721 Metadata)`, "🖼️");
    try {
      const { status, json } = await request("GET", `/api/metadata/${DYNAMIC_TOKEN_ID}`);
      info(`Status: ${status}  |  name: "${json?.name ?? "N/A"}"`);
      info(`         image: ${json?.image ? json.image.substring(0, 55) + "..." : "N/A"}`);
      const isValid = json?.name && json?.image && Array.isArray(json?.attributes);
      if (status === 200 && isValid) {
        record("NFT Metadata chuẩn ERC-721", true, `attributes: ${JSON.stringify(json.attributes)}`);
      } else {
        record("NFT Metadata chuẩn ERC-721", false, `status=${status} | thiếu name/image/attributes`);
      }
    } catch (e) { record("NFT Metadata ERC-721", false, e.message); }
  } else {
    title(4, "GET /api/metadata/:tokenId  (BỎ QUA)", "⊘");
    skip("Ví test chưa có vé → không có TokenID để kiểm tra NFT Metadata");
  }
}

// ════════════════════════════════════════════════════════
//  PHẦN 2: KIỂM TRA JWT AUTH
// ════════════════════════════════════════════════════════
async function runJwtTests() {
  section("JWT AUTHENTICATION TESTS");

  // ── Test A: Gọi route bảo vệ MÀ KHÔNG có Token ──────────────────────────
  title("A", "POST /api/checkin  không có Token (Kỳ vọng 401/403)", "🚫");
  try {
    const { status, json } = await request("POST", "/api/checkin", {
      tokenId: "99999", ownerWallet: TEST_WALLET
    });
    info(`Status: ${status}  |  message: "${json?.message ?? "N/A"}"`);
    if ([401, 403].includes(status) && json?.ok === false) {
      record("Chặn request không có token đúng cách", true,
        `status=${status} | "${json.message}"`);
    } else {
      record("Chặn request không có token đúng cách", false,
        `Kỳ vọng 401/403, nhận được ${status}`);
    }
  } catch (e) { record("Chặn không có token", false, e.message); }

  // ── Test B: Đăng nhập — lấy Token ────────────────────────────────────────
  title("B", "POST /api/auth/login  (Đăng nhập lấy JWT)", "🔑");
  try {
    const { status, json } = await request("POST", "/api/auth/login", {
      walletAddress: TEST_WALLET
    });
    info(`Status: ${status}  |  role: "${json?.user?.role ?? "N/A"}"`);
    if (status === 200 && json?.token) {
      AUTH_TOKEN = json.token;
      record("Đăng nhập thành công và nhận được token", true,
        `role=${json.user?.role} | token: ${AUTH_TOKEN.substring(0, 30)}...`);
    } else {
      record("Đăng nhập thành công và nhận được token", false,
        `status=${status} | ${json?.message ?? "Không nhận được token"}`);
    }
  } catch (e) { record("Đăng nhập JWT", false, e.message); }

  // ── Test C: Gọi route bảo vệ CÓ Token — test logic nghiệp vụ ────────────
  title("C", "POST /api/checkin  CÓ Token (Kỳ vọng qua JWT → lỗi 400/404)", "🛡️");
  if (!AUTH_TOKEN) {
    skip("Bỏ qua Test C vì Test B không lấy được token");
    results.push({ name: "Gọi API có Token — qua JWT vào lỗi logic", passed: false, detail: "Bỏ qua" });
  } else {
    try {
      const { status, json } = await request(
        "POST", "/api/checkin",
        { tokenId: "99999", ownerWallet: TEST_WALLET },
        AUTH_TOKEN
      );
      info(`Status: ${status}  |  message: "${json?.message ?? "N/A"}"`);
      // Qua JWT thành công → phải nhận lỗi nghiệp vụ (400/404), KHÔNG phải 401/403
      if ([400, 404].includes(status) && json?.ok === false) {
        record("Gọi API có Token — qua JWT vào lỗi logic", true,
          `status=${status} | "${json.message}" (JWT hợp lệ ✓)`);
      } else {
        record("Gọi API có Token — qua JWT vào lỗi logic", false,
          `Kỳ vọng 400/404, nhận được ${status}`);
      }
    } catch (e) { record("Gọi API có Token", false, e.message); }
  }
}

// ════════════════════════════════════════════════════════
//  PHẦN 3: KIỂM TRA SOCKET.IO REAL-TIME
// ════════════════════════════════════════════════════════
async function runSocketTest() {
  section("SOCKET.IO REAL-TIME TEST");
  title("S", "Socket.io — Nhận thông báo 'newTicketPurchased'", "🔌");

  return new Promise((resolve) => {
    const socket = socketClient(BASE_URL, { transports: ["websocket"] });
    let socketConnected = false;
    let eventReceived   = false;

    socket.on("connect", () => {
      socketConnected = true;
      info(`Socket kết nối thành công — ID: ${socket.id}`);

      // Sau khi kết nối → kích hoạt tạo vé để server emit event
      info("Đang gửi POST /api/tickets để kích hoạt Socket event...");
      request("POST", "/api/tickets", {
        OwnerWallet:     TEST_WALLET,
        TokenID:         `test-socket-${Date.now()}`,
        TransactionHash: `0x${Date.now().toString(16).padStart(64, "0")}`,
        IsUsed:          false,
      }, AUTH_TOKEN).then(({ status, json }) => {
        info(`Kết quả tạo vé — Status: ${status}  |  TicketID: ${json?.data?.TicketID ?? "N/A"}`);
      });
    });

    socket.on("newTicketPurchased", (data) => {
      eventReceived = true;
      info(`Event nhận được: "${data.message}"`);
      info(`Ticket: OwnerWallet=${data.ticket?.OwnerWallet ?? "N/A"}`);
      record("Nhận sự kiện Socket.io 'newTicketPurchased' thành công", true,
        `latency < 3000ms`);
      socket.disconnect();
      resolve();
    });

    socket.on("connect_error", (err) => {
      info(`Lỗi kết nối Socket: ${err.message}`);
    });

    // Timeout sau 3 giây — nếu không nhận được event
    setTimeout(() => {
      if (!eventReceived) {
        if (!socketConnected) {
          record("Nhận sự kiện Socket.io 'newTicketPurchased' thành công", false,
            "Không thể kết nối Socket.io tới server");
        } else {
          record("Nhận sự kiện Socket.io 'newTicketPurchased' thành công", false,
            "Timeout 3s — Server không emit event (kiểm tra POST /api/tickets)");
        }
        socket.disconnect();
        resolve();
      }
    }, 3000);
  });
}

// ════════════════════════════════════════════════════════
//  IN BẢNG TỔNG KẾT
// ════════════════════════════════════════════════════════
function printSummary() {
  const total  = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`\n${C.bold}${"═".repeat(58)}${C.reset}`);
  console.log(`${C.bold}  📊  KẾT QUẢ TỔNG KẾT${C.reset}`);
  console.log(`${C.bold}${"─".repeat(58)}${C.reset}`);

  results.forEach((r, i) => {
    const icon = r.passed ? `${C.green}PASS${C.reset}` : `${C.red}FAIL${C.reset}`;
    const idx  = String(i + 1).padStart(2, " ");
    console.log(`  ${idx}. [${icon}]  ${r.name}`);
    if (!r.passed && r.detail)
      console.log(`        ${C.gray}→ ${r.detail}${C.reset}`);
  });

  console.log(`${C.bold}${"─".repeat(58)}${C.reset}`);
  console.log(`  Tổng số test : ${C.bold}${total}${C.reset}`);
  console.log(`  ${C.green}PASS${C.reset}          : ${C.bold}${C.green}${passed}${C.reset}`);
  console.log(`  ${C.red}FAIL${C.reset}          : ${C.bold}${C.red}${failed}${C.reset}`);

  const allPassed = failed === 0;
  console.log(`\n  ${allPassed
    ? `${C.green}${C.bold}✔ Tất cả test đều PASS — Backend hoàn hảo!${C.reset}`
    : `${C.yellow}${C.bold}⚠ Có ${failed} test thất bại — Xem log bên trên để debug.${C.reset}`
  }`);
  console.log(`${C.bold}${"═".repeat(58)}${C.reset}\n`);
}

// ════════════════════════════════════════════════════════
//  ENTRY POINT
// ════════════════════════════════════════════════════════
async function main() {
  console.log(`\n${C.bold}${"═".repeat(58)}${C.reset}`);
  console.log(`${C.bold}  🚀  QA AUTOMATION v2.0 — Web3 Ticketing Backend${C.reset}`);
  console.log(`${C.bold}${"═".repeat(58)}${C.reset}`);
  console.log(`${C.gray}  BASE_URL    : ${BASE_URL}${C.reset}`);
  console.log(`${C.gray}  TEST_WALLET : ${TEST_WALLET}${C.reset}`);

  await runRestTests();
  await runJwtTests();
  await runSocketTest();

  printSummary();

  // Đợi 500ms để các kết nối dọn dẹp rồi mới exit
  setTimeout(() => process.exit(0), 500);
}

main().catch((err) => {
  console.error(`\n${C.red}${C.bold}[FATAL] ${err.message}${C.reset}`);
  console.error(`${C.gray}→ Hãy đảm bảo server đang chạy: npm run dev${C.reset}\n`);
  process.exit(1);
});