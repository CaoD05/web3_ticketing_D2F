-- 1. Users: Quản lý người dùng và định dạng ví
CREATE TABLE "Users" (
    "UserID" SERIAL PRIMARY KEY,
    "FullName" VARCHAR(100) NOT NULL,
    "Email" VARCHAR(100) UNIQUE,
    "WalletAddress" CHAR(42) NOT NULL UNIQUE, 
    "Role" VARCHAR(20) DEFAULT 'user',
    "CreatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "valid_wallet_address" CHECK ("WalletAddress" ~ '^0x[a-fA-F0-9]{40}$')
);

-- 2. Events: Thông tin sự kiện và Smart Contract
CREATE TABLE "Events" (
    "EventID" SERIAL PRIMARY KEY,
    "EventName" VARCHAR(200) NOT NULL,
    "MetaURL" TEXT,
    "EventDate" TIMESTAMPTZ,
    "Location" VARCHAR(200),
    "ContractAddress" CHAR(42), -- Địa chỉ contract của sự kiện (thường là NFT contract)
    "TotalTickets" INT NOT NULL,
    "TicketsSold" INT DEFAULT 0,
    "CreatedBy" INT REFERENCES "Users"("UserID") ON DELETE SET NULL,
    "CreatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "IsCancelled" BOOLEAN DEFAULT FALSE
);

-- 3. TicketTypes: Hạng vé và Giá (Đơn vị Wei)
CREATE TABLE "TicketTypes" (
    "TicketTypeID" SERIAL PRIMARY KEY,
    "EventID" INT REFERENCES "Events"("EventID") ON DELETE CASCADE,
    "TypeName" VARCHAR(50) NOT NULL,
    "Price" NUMERIC(38, 0) NOT NULL, -- QUAN TRỌNG: Lưu đơn vị Wei để không bị sai lệch số thập phân crypto
    "Quantity" INT NOT NULL
);

-- 4. Seats: Vị trí ngồi
CREATE TABLE "Seats" (
    "SeatID" SERIAL PRIMARY KEY,
    "EventID" INT REFERENCES "Events"("EventID") ON DELETE CASCADE,
    "SeatNumber" VARCHAR(20) NOT NULL,
    "Status" VARCHAR(20) DEFAULT 'Available'
);

-- 5. Orders: Giao dịch mua vé
CREATE TABLE "Orders" (
    "OrderID" SERIAL PRIMARY KEY,
    "UserID" INT REFERENCES "Users"("UserID"),
    "OrderDate" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "TotalAmount" NUMERIC(38, 0), -- Tổng tiền tính theo Wei
    "Status" VARCHAR(50), -- 'pending', 'completed', 'failed'
    "TxHash" CHAR(66) -- Hash giao dịch để đối soát trên Etherscan/Polygonscan
);

-- 6. Tickets: NFT Ticket thực tế
CREATE TABLE "Tickets" (
    "TicketID" SERIAL PRIMARY KEY,
    "TicketTypeID" INT REFERENCES "TicketTypes"("TicketTypeID"),
    "OrderID" INT REFERENCES "Orders"("OrderID"),
    "OwnerWallet" CHAR(42) NOT NULL,
    "SeatID" INT REFERENCES "Seats"("SeatID"),
    "TokenID" BIGINT UNIQUE, -- TokenID của NFT (thường là uint256 trong Solidity)
    "TransactionHash" CHAR(66), -- Hash khi Mint NFT thành công
    "QRCode" TEXT, 
    "IsUsed" BOOLEAN DEFAULT FALSE
);

-- 7. CheckIns: Lịch sử soát vé
CREATE TABLE "CheckIns" (
    "CheckInID" SERIAL PRIMARY KEY,
    "TicketID" INT UNIQUE REFERENCES "Tickets"("TicketID"),
    "CheckInTime" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "VerifiedBy" CHAR(42) -- Địa chỉ ví của nhân viên soát vé (Staff)
);

-- TỐI ƯU HÓA TRUY VẤN (INDEXES)
CREATE INDEX idx_tickets_owner_wallet ON "Tickets"("OwnerWallet");
CREATE INDEX idx_tickets_tokenid ON "Tickets"("TokenID");
CREATE INDEX idx_orders_user ON "Orders"("UserID");