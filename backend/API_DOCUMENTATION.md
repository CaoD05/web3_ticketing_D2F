# 📘 Web3 Ticketing — Backend API Documentation

> **Base URL:** `http://localhost:5000/api`
> **Auth:** JWT Bearer Token (`Authorization: Bearer <token>`)
> **Realtime:** Socket.io tại `http://localhost:5000`

---

## 🔐 1. Authentication (`/api/auth`)

### `POST /auth/login` — Đăng nhập
- **Auth:** Public
- **Body (Email):** `{ "email": "user@mail.com", "password": "12345678" }`
- **Body (Wallet):** `{ "walletAddress": "0x..." }`
- **Response:** `{ ok, token, user: { userId, fullName, email, role, walletAddress, createdAt } }`

### `POST /auth/register` — Đăng ký
- **Auth:** Public
- **Body:** `{ "Email": "user@mail.com", "Password": "12345678", "FullName?": "Tên" }`
- **Response:** `201 { ok, token, user }`
- **Lỗi:** `409` nếu email đã tồn tại

### `POST /auth/google` — Đăng nhập/Đăng ký bằng Google
- **Auth:** Public
- **Body:** `{ "idToken": "google_credential_token" }`
- **Response:** `{ ok, token, user, isNewUser: true/false }`
- **Logic:** Tìm GoogleSub → nếu có: login | nếu email trùng: liên kết | nếu mới: tạo account

### `GET /auth/me` — Thông tin user hiện tại
- **Auth:** 🔒 JWT
- **Response:** `{ ok, user }`

### `PUT /auth/profile` — Cập nhật profile
- **Auth:** 🔒 JWT
- **Body:** `{ "FullName?": "Tên mới", "Email?": "email@moi.com" }`

### `PUT /auth/link-wallet` — Liên kết ví MetaMask
- **Auth:** 🔒 JWT
- **Body:** `{ "walletAddress": "0x..." }`

### `PUT /auth/change-password` — Đổi mật khẩu
- **Auth:** 🔒 JWT
- **Body:** `{ "currentPassword": "...", "newPassword": "..." }`

---

## 🎪 2. Events (`/api/events`)

### `GET /events` — Danh sách sự kiện
- **Auth:** Public
- **Response:** `{ ok, data: [{ EventID, EventName, Description, Location, EventDate, TotalTickets, TicketsSold, ImageUrl, ExternalLink, CreatedAt }] }`

### `GET /events/:id` — Chi tiết sự kiện
- **Auth:** Public
- **Response:** `{ ok, data: { ...event, TicketTypes: [...] } }`

### `POST /events` — Tạo sự kiện
- **Auth:** 🔒 Admin/Organizer
- **Body:** `{ "EventName", "Description?", "Location?", "EventDate?", "TotalTickets?", "ImageUrl?", "ExternalLink?" }`
- **Note:** Nếu `ImageUrl` trống + có `ExternalLink` → auto scrape `og:image`

### `PUT /events/:id` — Cập nhật sự kiện
- **Auth:** 🔒 Admin/Organizer
- **Body:** Partial update — chỉ gửi field cần sửa

### `DELETE /events/:id` — Xóa sự kiện
- **Auth:** 🔒 Admin only
- **Điều kiện:** Chưa có vé nào được bán

### `PATCH /events/:id/cancel` — Hủy sự kiện
- **Auth:** 🔒 Admin/Organizer
- **Hành vi:** Prefix `[CANCELLED]` vào EventName

---

## 🎫 3. Ticket Types (`/api/ticket-types`)

### `GET /events/:eventId/ticket-types` — Loại vé của sự kiện
- **Auth:** Public
- **Response:** `{ ok, data: [{ TicketTypeID, TypeName, Price, Quantity, Sold }] }`

### `POST /events/:eventId/ticket-types` — Tạo loại vé
- **Auth:** 🔒 Admin/Organizer
- **Body:** `{ "TypeName": "VIP", "Price": 500000, "Quantity": 100 }`

### `PUT /ticket-types/:id` — Sửa loại vé
- **Auth:** 🔒 Admin/Organizer

### `DELETE /ticket-types/:id` — Xóa loại vé
- **Auth:** 🔒 Admin/Organizer
- **Điều kiện:** Chưa bán vé nào

---

## 🎟️ 4. Tickets (`/api/tickets`)

### `GET /tickets` — Tất cả vé
- **Auth:** Public

### `GET /my-tickets?wallet=0x...` — Vé của tôi
- **Auth:** Public (cần query param `wallet`)
- **Response:** `{ ok, data: [{ TicketID, TokenID, OwnerWallet, IsUsed, EventName, EventDate }] }`

### `POST /tickets` — Tạo vé (internal/on-chain)
- **Auth:** Public
- **Body:** `{ "TicketTypeID", "OrderID?", "OwnerWallet", "SeatID?", "TokenID?", "TransactionHash?", "QRCode?" }`
- **Socket.io:** Emit `newTicketPurchased` khi thành công

### `POST /tickets/transfer` — Chuyển nhượng vé
- **Auth:** 🔒 JWT
- **Body:** `{ "TicketID": 1, "ToWallet": "0x..." }`

### `POST /tickets/list-resale` — Đăng bán lại vé
- **Auth:** 🔒 JWT
- **Body:** `{ "TicketID": 1, "Price": 300000 }`

### `GET /tickets/resale` — Danh sách vé đang bán lại
- **Auth:** Public
- **Response:** Bao gồm `ResalePrice`, `EventName`, `Location`, `TypeName`

### `POST /tickets/buy-resale` — Mua vé bán lại
- **Auth:** 🔒 JWT
- **Body:** `{ "TicketID": 1, "TxHash?": "0x..." }`

### `POST /checkin` — Soát vé / Check-in
- **Auth:** 🔒 Admin/Organizer
- **Body:** `{ "tokenId": "...", "ownerWallet": "0x..." }`

### `GET /metadata/:tokenId` — NFT Metadata (ERC-721)
- **Auth:** Public
- **Response:** `{ name, description, image, attributes }`

---

## 📦 5. Orders (`/api/orders`)

### `POST /orders` — Tạo đơn hàng (mua vé)
- **Auth:** 🔒 JWT
- **Rate Limit:** 10 req / 15 phút / IP
- **Body:** `{ "TicketTypeID": 1, "Quantity?": 2, "TxHash?": "0x..." }`
- **Logic:** Kiểm tra tồn kho → tạo Order + Tickets trong transaction → gửi email xác nhận (async)
- **Response:** `201 { ok, data: { order, tickets: [...] } }`

### `GET /my-orders` — Đơn hàng của tôi
- **Auth:** 🔒 JWT

### `GET /orders` — Tất cả đơn hàng
- **Auth:** 🔒 Admin only

### `GET /orders/:id` — Chi tiết đơn hàng
- **Auth:** 🔒 JWT (user chỉ xem được đơn của mình, admin xem tất cả)

---

## 📊 6. Dashboard (`/api/dashboard`)

### `GET /dashboard/stats` — Tổng quan hệ thống
- **Auth:** 🔒 Admin
- **Response:** `{ totalUsers, totalEvents, activeEvents, totalTickets, ticketsUsed, totalOrders, totalRevenue, totalCheckins, usersByRole }`

### `GET /dashboard/sales?days=30` — Doanh thu theo ngày
- **Auth:** 🔒 Admin
- **Response:** `{ data: [{ date, revenue, orders }] }`

### `GET /dashboard/events/:id/stats` — Thống kê sự kiện
- **Auth:** 🔒 Admin/Organizer
- **Response:** `{ totalSold, totalUsed, totalCheckins, eventRevenue, ticketTypeStats }`

### `GET /checkins?eventId=1&page=1&limit=20` — Lịch sử check-in
- **Auth:** 🔒 Admin/Organizer
- **Response:** Phân trang

### `GET /checkins/stats` — Thống kê check-in theo sự kiện
- **Auth:** 🔒 Admin/Organizer

---

## 👥 7. User Management (`/api/users`)

### `GET /users` — Danh sách users
- **Auth:** 🔒 Admin

### `GET /users/:id` — Chi tiết user
- **Auth:** 🔒 Admin

### `POST /users` — Tạo user
- **Auth:** 🔒 Admin
- **Body:** `{ "FullName", "Email?", "WalletAddress?", "Role?": "user|organizer|admin" }`

### `PUT /users/:id/role` — Đổi role
- **Auth:** 🔒 Admin
- **Body:** `{ "Role": "organizer" }`

### `DELETE /users/:id` — Xóa user
- **Auth:** 🔒 Admin
- **Điều kiện:** User không có đơn hàng

---

## 📁 8. Upload (`/api/upload`)

### `POST /upload` — Upload ảnh
- **Auth:** 🔒 JWT
- **Rate Limit:** 20 req / 15 phút / IP
- **Content-Type:** `multipart/form-data`
- **Field name:** `image`
- **Giới hạn:** 5MB, chỉ jpeg/png/webp/gif
- **Response:** `{ ok, url: "https://...supabase.co/.../image.jpg" }`

---

## 🔌 9. Realtime (Socket.io)

```javascript
import { io } from "socket.io-client";
const socket = io("http://localhost:5000");

// Lắng nghe vé mới được mua
socket.on("newTicketPurchased", (data) => {
  console.log(data.message); // "🎉 Một vé mới vừa được phát hành!"
  console.log(data.ticket);
});
```

---

## 🛠️ 10. Utility Endpoints

### `GET /health` — Health check
- **Response:** `{ ok: true, db: "connected" }`

### `GET /web3/info` — Smart Contract info
- **Response:** `{ contractAddress, nextEventId, nextTicketId }`

---

## 📋 Quy ước chung

| Quy ước | Chi tiết |
|---------|----------|
| **Response format** | `{ ok: boolean, message?: string, data?: any }` |
| **Auth header** | `Authorization: Bearer <JWT_TOKEN>` |
| **Roles** | `admin`, `organizer`, `user` |
| **Error codes** | `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `409` Conflict, `500` Server Error |
| **Rate limits** | Orders: 10/15min, Upload: 20/15min |

## 🔑 Lấy Token

```javascript
// 1. Đăng nhập
const res = await axios.post("/api/auth/login", { email, password });
const token = res.data.token;

// 2. Dùng token cho các API protected
axios.get("/api/auth/me", {
  headers: { Authorization: `Bearer ${token}` }
});
```
