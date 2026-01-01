# 📚 SuiStage Role 2 - 完整文件說明與協作關係

## 目錄
1. [項目架構總覽](#項目架構總覽)
2. [智能合約文件 (Contracts)](#智能合約文件)
3. [後端文件 (Backend)](#後端文件)
4. [協作流程](#協作流程)
5. [數據流向](#數據流向)
6. [實際運行範例](#實際運行範例)

---

## 項目架構總覽

```
整體架構：

用戶 → 前端 (Role 1) → 後端 API → 數據庫
                  ↓            ↓
              Sui 區塊鏈 ← 智能合約
                  ↓
              Walrus 存儲
```

### 三層架構

```
┌─────────────────────────────────────────┐
│  Layer 1: 智能合約層 (Blockchain)        │
│  - event.move (核心邏輯)                 │
│  - 部署在 Sui 區塊鏈上                   │
└─────────────────────────────────────────┘
                ↕️ (區塊鏈交互)
┌─────────────────────────────────────────┐
│  Layer 2: 後端服務層 (Backend API)       │
│  - Express.js 服務器                     │
│  - 監聽區塊鏈事件                        │
│  - 提供 REST API                         │
└─────────────────────────────────────────┘
                ↕️ (HTTP API)
┌─────────────────────────────────────────┐
│  Layer 3: 數據存儲層 (Database)          │
│  - PostgreSQL 數據庫                     │
│  - Walrus 圖片存儲                       │
└─────────────────────────────────────────┘
```

---

## 智能合約文件 (Contracts)

### 📁 contracts/

#### 1. **Move.toml**
```toml
[package]
name = "suistage_events"
version = "0.0.1"
```

**功能**：
- Move 項目的配置文件
- 定義項目名稱、版本
- 聲明依賴（Sui Framework）
- 設置地址映射

**作用**：
- 告訴 Sui CLI 如何編譯項目
- 管理依賴版本
- 配置部署參數

**與其他文件的關係**：
- 被 `sui move build` 命令讀取
- 影響所有 .move 文件的編譯

---

#### 2. **sources/event.move** (核心智能合約)

**文件大小**：約 400 行

**功能概述**：
這是整個系統的核心，管理活動的生命週期。

**主要組件**：

##### A. 數據結構

```move
/// Event 主結構 - 代表一個活動
struct Event has key, store {
    id: UID,                    // Sui 對象 ID
    name: String,               // 活動名稱 "五月天演唱會"
    description: String,        // 描述
    venue: String,              // 場地 "台北小巨蛋"
    date: u64,                  // 時間戳 (毫秒)
    organizer: address,         // 主辦方地址 0x123...
    total_seats: u64,           // 總座位數 1000
    available_seats: u64,       // 可用座位 850
    price_per_seat: u64,        // 每張票價格 (MIST)
    image_url: String,          // 圖片 URL (Walrus)
    is_active: bool,            // 是否有效
    created_at: u64,            // 創建時間
    updated_at: u64             // 更新時間
}

/// EventRegistry - 追蹤所有活動
struct EventRegistry has key {
    id: UID,
    event_count: u64            // 已創建活動數量
}
```

**為什麼需要這些欄位？**
- `id`: Sui 要求每個對象都有唯一 ID
- `organizer`: 用於權限控制（只有主辦方能修改）
- `available_seats`: 實時追蹤剩餘座位
- `is_active`: 用於軟刪除（取消活動）

##### B. 核心函數

```move
// 1️⃣ 創建活動
public entry fun create_event(
    registry: &mut EventRegistry,    // 需要 Registry
    name: vector<u8>,                // 活動名稱
    description: vector<u8>,
    venue: vector<u8>,
    date: u64,                       // Unix 時間戳
    total_seats: u64,
    price_per_seat: u64,
    image_url: vector<u8>,
    clock: &Clock,                   // Sui 時鐘對象
    ctx: &mut TxContext
)
```

**這個函數做什麼？**
1. 驗證日期（必須是未來的時間）
2. 創建 Event 對象
3. 更新 Registry 計數器
4. 發射 EventCreated 事件（後端會監聽）
5. 將 Event 設為 Shared Object（所有人可讀）

**調用範例**：
```bash
sui client call \
  --package 0xabc... \
  --module event \
  --function create_event \
  --args $REGISTRY_ID "Concert" ...
```

```move
// 2️⃣ 更新活動
public entry fun update_event(
    event: &mut Event,               // 要修改的活動
    name: vector<u8>,
    description: vector<u8>,
    venue: vector<u8>,
    date: u64,
    image_url: vector<u8>,
    clock: &Clock,
    ctx: &TxContext
)
```

**這個函數做什麼？**
1. 檢查調用者是否為 organizer
2. 檢查活動是否還有效
3. 更新活動信息
4. 發射 EventUpdated 事件

**為什麼需要權限檢查？**
```move
assert!(event.organizer == tx_context::sender(ctx), ERROR_NOT_ORGANIZER);
```
- 防止其他人亂改你的活動
- 確保數據完整性

```move
// 3️⃣ 取消活動
public entry fun cancel_event(
    event: &mut Event,
    ctx: &TxContext
)
```

**這個函數做什麼？**
1. 檢查權限
2. 將 `is_active` 設為 false
3. 發射 EventCancelled 事件

**為什麼不直接刪除？**
- Sui 中對象很難真正刪除
- 軟刪除可以保留歷史記錄
- 已售票券仍需要參考這個活動

```move
// 4️⃣ 預留座位 (當有人買票時)
public entry fun reserve_seats(
    event: &mut Event,
    seat_count: u64,                 // 要買幾張票
    clock: &Clock,
    ctx: &TxContext
)
```

**這個函數做什麼？**
1. 檢查活動是否有效
2. 檢查座位是否充足
3. 減少 `available_seats`
4. 發射 SeatsReserved 事件

**誰會調用這個函數？**
- Role 3 的 Ticket 合約
- 當用戶購買票券時

**座位管理邏輯**：
```move
// 購票前：available_seats = 1000
event.available_seats = event.available_seats - seat_count;
// 購票後：available_seats = 990 (如果買 10 張)
```

##### C. 事件 (Events)

```move
struct EventCreated has copy, drop {
    event_id: ID,
    organizer: address,
    name: String,
    date: u64,
    venue: String,
    total_seats: u64,
    price_per_seat: u64
}
```

**為什麼需要事件？**
- 區塊鏈上發生的事情不會自動通知後端
- 事件是通知機制
- 後端監聽這些事件來同步數據

**事件流程**：
```
1. 用戶在區塊鏈創建活動
   ↓
2. 合約發射 EventCreated 事件
   ↓
3. 後端監聽到事件
   ↓
4. 後端將數據寫入數據庫
   ↓
5. 前端可以立即查詢到新活動
```

##### D. 查詢函數

```move
public fun get_event_info(event: &Event): (
    String,  // name
    String,  // venue
    u64,     // date
    u64,     // available_seats
    u64,     // price_per_seat
    bool     // is_active
)
```

**為什麼需要查詢函數？**
- Move 的 struct 字段默認私有
- 需要公開函數來讀取數據
- 前端/後端通過這些函數獲取信息

**與其他文件的關係**：
- **→ backend/src/services/suiClient.ts**: 調用這些查詢函數
- **→ Role 3 (Ticket)**: 調用 `reserve_seats()`
- **→ 後端監聽**: 監聽所有事件

---

#### 3. **sources/event_tests.move** (測試文件)

**文件大小**：約 300 行

**功能**：
- 測試合約的所有功能
- 確保邏輯正確
- 防止 Bug

**主要測試**：

```move
#[test]
fun test_create_event() {
    // 模擬創建活動流程
    // 驗證活動數據正確
}

#[test]
fun test_reserve_seats() {
    // 測試座位預訂
    // 驗證座位數減少
}

#[test]
#[expected_failure(abort_code = ERROR_NOT_ORGANIZER)]
fun test_update_event_unauthorized() {
    // 測試權限控制
    // 確保非主辦方無法修改
}
```

**運行測試**：
```bash
sui move test
```

**與其他文件的關係**：
- 測試 `event.move` 的所有函數
- 在部署前運行，確保代碼正確

---

## 後端文件 (Backend)

### 📁 backend/

#### 配置文件層

#### 1. **package.json**

```json
{
  "name": "suistage-event-api",
  "dependencies": {
    "@mysten/sui.js": "^0.54.1",  // Sui SDK
    "express": "^4.18.2",          // Web 框架
    "pg": "^8.11.3",               // PostgreSQL
    "winston": "^3.11.0"           // 日誌
  }
}
```

**功能**：
- 定義項目依賴
- 定義 npm 腳本
- 項目元數據

**依賴說明**：
- `@mysten/sui.js`: 與 Sui 區塊鏈交互
- `express`: 創建 REST API
- `pg`: 連接 PostgreSQL
- `winston`: 記錄日誌
- `multer`: 處理文件上傳
- `dotenv`: 讀取環境變數

**npm 腳本**：
```bash
npm run dev      # 開發模式（熱重載）
npm run build    # 編譯 TypeScript
npm start        # 生產模式
```

---

#### 2. **tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",      // 編譯目標
    "module": "commonjs",    // 模塊系統
    "outDir": "./dist",      // 輸出目錄
    "strict": true           // 嚴格模式
  }
}
```

**功能**：
- 配置 TypeScript 編譯器
- 定義代碼風格和規則

**為什麼用 TypeScript？**
- 類型安全
- 更好的 IDE 支持
- 減少運行時錯誤

---

#### 3. **.env.example**

```bash
PORT=3000
DATABASE_URL=postgresql://...
PACKAGE_ID=0x...
EVENT_REGISTRY_ID=0x...
WALRUS_AGGREGATOR_URL=https://...
```

**功能**：
- 環境變數範本
- 敏感信息不提交到 Git

**使用方法**：
```bash
cp .env.example .env
# 編輯 .env，填入實際值
```

**關鍵變數**：
- `PACKAGE_ID`: 部署合約後獲得
- `EVENT_REGISTRY_ID`: 部署合約後獲得
- `DATABASE_URL`: PostgreSQL 連接字符串

---

#### 4. **schema.sql** (數據庫結構)

```sql
CREATE TABLE events (
    id VARCHAR(66) PRIMARY KEY,        -- Sui Object ID (0x + 64 hex)
    name VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    date BIGINT NOT NULL,              -- Unix 時間戳 (毫秒)
    organizer VARCHAR(66) NOT NULL,    -- Sui 地址
    total_seats INTEGER NOT NULL,
    available_seats INTEGER NOT NULL,
    price_per_seat BIGINT NOT NULL,    -- 價格 (MIST)
    image_url TEXT,                    -- Walrus Blob ID
    is_active BOOLEAN DEFAULT TRUE
);
```

**為什麼需要數據庫？**
- 區塊鏈查詢慢且昂貴
- 數據庫提供快速查詢
- 支持複雜的篩選和排序

**數據同步策略**：
```
區塊鏈 = 數據來源（權威）
數據庫 = 緩存（快速查詢）

流程：
1. 用戶在區塊鏈創建活動
2. 後端監聽事件
3. 後端將數據寫入數據庫
4. 前端查詢數據庫（快！）
```

**關鍵表**：

```sql
-- events 表：存儲活動信息
-- event_transactions 表：記錄所有區塊鏈交易
-- seat_reservations 表：記錄座位預訂
```

**索引優化**：
```sql
CREATE INDEX idx_events_date ON events(date);
-- 為什麼？查詢即將舉行的活動時很快
```

---

### 入口文件層

#### 5. **src/index.ts** (主入口)

**功能**：Express 應用的啟動文件

**代碼結構**：

```typescript
import express from 'express';
import cors from 'cors';
import { eventRoutes } from './routes/eventRoutes';

const app = express();

// 中間件
app.use(cors());              // 允許跨域
app.use(express.json());      // 解析 JSON

// 路由
app.use('/api/events', eventRoutes);

// 啟動服務器
app.listen(3000);
```

**執行流程**：
```
1. 加載配置 (dotenv)
   ↓
2. 設置中間件 (CORS, Body Parser)
   ↓
3. 註冊路由 (/api/events)
   ↓
4. 啟動服務器 (監聽 3000 端口)
   ↓
5. 開始處理請求
```

**健康檢查端點**：
```typescript
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime()
    });
});
```

**為什麼需要？**
- 檢查服務是否運行
- 監控系統使用

---

### 配置層

#### 6. **src/config/index.ts**

**功能**：集中管理所有配置

```typescript
export const config = {
    port: parseInt(process.env.PORT || '3000'),
    
    database: {
        url: process.env.DATABASE_URL
    },
    
    sui: {
        network: 'testnet',
        rpcUrl: 'https://fullnode.testnet.sui.io:443',
        packageId: process.env.PACKAGE_ID,
        eventRegistryId: process.env.EVENT_REGISTRY_ID
    },
    
    walrus: {
        aggregatorUrl: process.env.WALRUS_AGGREGATOR_URL,
        publisherUrl: process.env.WALRUS_PUBLISHER_URL
    }
};
```

**為什麼集中管理？**
- 一個地方修改配置
- 類型安全
- 易於測試

**使用範例**：
```typescript
import { config } from '../config';

const client = new SuiClient({ 
    url: config.sui.rpcUrl 
});
```

---

### 服務層 (核心業務邏輯)

#### 7. **src/services/database.ts**

**功能**：數據庫連接管理

**關鍵組件**：

```typescript
import { Pool } from 'pg';

// 創建連接池
export const pool = new Pool({
    connectionString: config.database.url,
    max: 20,                    // 最多 20 個連接
    idleTimeoutMillis: 30000    // 空閒 30 秒斷開
});

// 封裝查詢函數
export async function query(text: string, params?: any[]) {
    const result = await pool.query(text, params);
    return result;
}
```

**為什麼用連接池？**
- 創建數據庫連接很慢
- 連接池重用連接
- 提高性能

**使用範例**：
```typescript
import { query } from './database';

const events = await query(
    'SELECT * FROM events WHERE date > $1',
    [Date.now()]
);
```

---

#### 8. **src/services/suiClient.ts** (Sui 區塊鏈交互)

**功能**：與 Sui 區塊鏈通信

**關鍵功能**：

```typescript
import { SuiClient } from '@mysten/sui.js/client';

// 初始化客戶端
export const suiClient = new SuiClient({ 
    url: config.sui.rpcUrl 
});

// 1️⃣ 從區塊鏈讀取活動
export async function getEventFromChain(eventId: string) {
    const event = await suiClient.getObject({
        id: eventId,
        options: {
            showContent: true  // 顯示內容
        }
    });
    return event;
}

// 2️⃣ 訂閱事件
export async function subscribeToEventCreation(callback) {
    await suiClient.subscribeEvent({
        filter: {
            MoveEventType: `${PACKAGE_ID}::event::EventCreated`
        },
        onMessage: (event) => {
            callback(event);  // 有新活動時調用
        }
    });
}

// 3️⃣ 查詢歷史事件
export async function queryEvents(eventType: string) {
    const result = await suiClient.queryEvents({
        query: { MoveEventType: eventType }
    });
    return result;
}
```

**事件監聽流程**：
```
1. 服務啟動
   ↓
2. 訂閱 EventCreated 事件
   ↓
3. 區塊鏈有新活動
   ↓
4. 收到事件通知
   ↓
5. 調用 callback 函數
   ↓
6. 將數據寫入數據庫
```

**為什麼需要事件監聽？**
- 實時同步區塊鏈數據
- 不需要輪詢（節省資源）
- 數據及時更新

---

#### 9. **src/services/walrusService.ts** (Walrus 存儲)

**功能**：管理圖片上傳到 Walrus

**關鍵功能**：

```typescript
// 上傳文件到 Walrus
export async function uploadToWalrus(fileBuffer: Buffer): Promise<string> {
    const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/store`, {
        method: 'PUT',
        body: fileBuffer
    });
    
    const data = await response.json();
    const blobId = data.newlyCreated.blobObject.blobId;
    
    return blobId;  // 返回 Blob ID
}

// 獲取文件 URL
export function getWalrusUrl(blobId: string): string {
    return `${WALRUS_AGGREGATOR_URL}/v1/${blobId}`;
}

// 驗證圖片
export function validateImageFile(buffer: Buffer): boolean {
    // 檢查文件大小
    if (buffer.length > 10 * 1024 * 1024) {  // 10MB
        throw new Error('File too large');
    }
    
    // 檢查文件類型（魔數）
    const jpgSignature = [0xFF, 0xD8, 0xFF];
    const pngSignature = [0x89, 0x50, 0x4E, 0x47];
    
    // 驗證邏輯...
}
```

**上傳流程**：
```
1. 前端選擇圖片
   ↓
2. 發送到 POST /api/events/upload-image
   ↓
3. Multer 解析文件
   ↓
4. validateImageFile() 驗證
   ↓
5. uploadToWalrus() 上傳
   ↓
6. 返回 Blob ID
   ↓
7. 前端創建活動時使用這個 ID
```

**為什麼用 Walrus？**
- 去中心化存儲
- 永久保存
- 不依賴中心服務器

---

#### 10. **src/services/eventService.ts** (業務邏輯核心)

**功能**：活動管理的所有業務邏輯

**關鍵函數**：

```typescript
// 1️⃣ 獲取所有活動（分頁、篩選）
export async function getAllEvents(options: {
    page?: number;
    limit?: number;
    search?: string;
    organizer?: string;
    upcoming?: boolean;
}) {
    // 構建 SQL 查詢
    let whereConditions = [];
    let params = [];
    
    if (options.search) {
        whereConditions.push(`name ILIKE $1`);
        params.push(`%${options.search}%`);
    }
    
    if (options.upcoming) {
        whereConditions.push(`date > EXTRACT(EPOCH FROM NOW()) * 1000`);
    }
    
    // 執行查詢
    const events = await query(
        `SELECT * FROM events WHERE ${whereConditions.join(' AND ')}
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
    );
    
    return events;
}

// 2️⃣ 從區塊鏈同步活動
export async function syncEventFromChain(eventId: string) {
    // 步驟 1: 從區塊鏈讀取
    const eventData = await getEventFromChain(eventId);
    const fields = parseEventContent(eventData);
    
    // 步驟 2: 轉換數據格式
    const event = {
        id: eventId,
        name: fields.name,
        venue: fields.venue,
        date: parseInt(fields.date),
        organizer: fields.organizer,
        total_seats: parseInt(fields.total_seats),
        available_seats: parseInt(fields.available_seats),
        price_per_seat: parseInt(fields.price_per_seat),
        image_url: fields.image_url,
        is_active: fields.is_active
    };
    
    // 步驟 3: 寫入數據庫
    await upsertEvent(event);
    
    return event;
}

// 3️⃣ 插入或更新活動
async function upsertEvent(event: Event) {
    await query(`
        INSERT INTO events (id, name, venue, ...)
        VALUES ($1, $2, $3, ...)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            available_seats = EXCLUDED.available_seats,
            ...
    `, [event.id, event.name, event.venue, ...]);
}

// 4️⃣ 獲取活動統計
export async function getEventStats(eventId: string) {
    const ticketsSold = await query(`
        SELECT COUNT(*) FROM seat_reservations 
        WHERE event_id = $1
    `, [eventId]);
    
    const revenue = await query(`
        SELECT SUM(total_price) FROM seat_reservations 
        WHERE event_id = $1
    `, [eventId]);
    
    return {
        ticketsSold: ticketsSold.rows[0].count,
        totalRevenue: revenue.rows[0].sum
    };
}
```

**這個文件是業務邏輯的心臟**，負責：
- 數據庫查詢
- 區塊鏈交互
- 數據轉換
- 業務規則

---

### 控制器層

#### 11. **src/controllers/eventController.ts**

**功能**：處理 HTTP 請求，調用服務層

**關鍵函數**：

```typescript
// 1️⃣ 獲取所有活動
export async function getAllEvents(req: Request, res: Response) {
    try {
        // 從 URL 參數解析選項
        const options = {
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 10,
            search: req.query.search as string,
            upcoming: req.query.upcoming === 'true'
        };
        
        // 調用服務層
        const result = await eventService.getAllEvents(options);
        
        // 返回 JSON 響應
        res.json({
            success: true,
            data: result.events,
            pagination: result.pagination
        });
    } catch (error) {
        // 錯誤處理
        next(error);
    }
}

// 2️⃣ 獲取單個活動
export async function getEventById(req: Request, res: Response) {
    const { id } = req.params;  // 從 URL 獲取 ID
    
    // 先查數據庫
    let event = await eventService.getEventById(id);
    
    // 如果沒有，從區塊鏈同步
    if (!event) {
        event = await eventService.syncEventFromChain(id);
    }
    
    if (!event) {
        return res.status(404).json({
            success: false,
            error: 'Event not found'
        });
    }
    
    res.json({
        success: true,
        data: event
    });
}

// 3️⃣ 上傳圖片
export async function uploadEventImage(req: Request, res: Response) {
    if (!req.file) {
        return res.status(400).json({
            error: 'No file uploaded'
        });
    }
    
    // 上傳到 Walrus
    const blobId = await walrusService.uploadImageToWalrus(req.file.buffer);
    const imageUrl = walrusService.getWalrusUrl(blobId);
    
    res.json({
        success: true,
        data: { blobId, imageUrl }
    });
}
```

**控制器的責任**：
1. 解析 HTTP 請求
2. 驗證輸入
3. 調用服務層
4. 格式化響應
5. 錯誤處理

**請求流程**：
```
HTTP Request
    ↓
路由 (eventRoutes.ts)
    ↓
中間件 (驗證)
    ↓
控制器 (eventController.ts) ← 你在這裡
    ↓
服務層 (eventService.ts)
    ↓
數據庫 / 區塊鏈
```

---

### 路由層

#### 12. **src/routes/eventRoutes.ts**

**功能**：定義 API 端點

```typescript
import { Router } from 'express';
import * as eventController from '../controllers/eventController';
import { validateEventQuery } from '../middleware/validation';

const router = Router();

// GET /api/events - 獲取所有活動
router.get('/', 
    validateEventQuery,           // 中間件：驗證
    eventController.getAllEvents  // 控制器：處理
);

// GET /api/events/upcoming - 即將舉行的活動
router.get('/upcoming', 
    eventController.getUpcomingEvents
);

// GET /api/events/:id - 獲取特定活動
router.get('/:id', 
    validateEventId,              // 驗證 ID 格式
    eventController.getEventById
);

// POST /api/events/upload-image - 上傳圖片
router.post('/upload-image', 
    upload.single('image'),       // Multer 中間件
    eventController.uploadEventImage
);

export { router as eventRoutes };
```

**路由設計**：
```
GET    /api/events              獲取列表
GET    /api/events/upcoming     即將舉行
GET    /api/events/search?q=xx  搜尋
GET    /api/events/:id          單個活動
GET    /api/events/:id/stats    統計數據
POST   /api/events/upload-image 上傳圖片
POST   /api/events/:id/sync     手動同步
```

**中間件鏈**：
```
請求 → 驗證中間件 → 控制器 → 服務 → 響應
```

---

### 中間件層

#### 13. **src/middleware/validation.ts**

**功能**：驗證請求參數

```typescript
import { query, param, validationResult } from 'express-validator';

// 驗證查詢參數
export const validateEventQuery = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be positive'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be 1-100'),
    
    query('search')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 100 }),
    
    handleValidationErrors  // 處理錯誤
];

// 驗證 Event ID
export const validateEventId = [
    param('id')
        .matches(/^0x[a-fA-F0-9]{64}$/)
        .withMessage('Invalid Sui object ID'),
    
    handleValidationErrors
];

function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
}
```

**為什麼需要驗證？**
- 防止無效輸入
- 提高安全性
- 提供清晰的錯誤信息

**驗證範例**：
```
請求：GET /api/events?page=-1
驗證：page 必須 >= 1
結果：返回 400 錯誤
```

---

#### 14. **src/middleware/errorHandler.ts**

**功能**：統一錯誤處理

```typescript
export function errorHandler(err, req, res, next) {
    // 記錄錯誤
    logger.error('Error occurred', {
        error: err.message,
        stack: err.stack,
        path: req.path
    });
    
    // 確定錯誤類型
    let statusCode = 500;
    let message = 'Internal server error';
    
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation error';
    } else if (err.code === '23505') {  // PostgreSQL 重複鍵
        statusCode = 409;
        message = 'Resource already exists';
    }
    
    // 返回錯誤響應
    res.status(statusCode).json({
        success: false,
        error: message,
        // 開發環境顯示詳細錯誤
        ...(process.env.NODE_ENV === 'development' && {
            details: err.message,
            stack: err.stack
        })
    });
}
```

**錯誤處理流程**：
```
錯誤發生
    ↓
被 try-catch 捕獲
    ↓
傳給 next(error)
    ↓
errorHandler 處理
    ↓
返回統一格式的錯誤響應
    ↓
記錄到日誌
```

---

### 工具層

#### 15. **src/utils/logger.ts**

**功能**：日誌管理

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        // 控制台輸出
        new winston.transports.Console({
            format: winston.format.colorize()
        }),
        
        // 文件輸出
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error'
        }),
        new winston.transports.File({
            filename: 'logs/combined.log'
        })
    ]
});
```

**日誌級別**：
```
error:  嚴重錯誤
warn:   警告
info:   一般信息
debug:  調試信息
```

**使用範例**：
```typescript
logger.info('Event synced', { eventId: '0x123...' });
logger.error('Database connection failed', { error: err.message });
logger.debug('Query executed', { sql: query });
```

**為什麼需要日誌？**
- 調試問題
- 監控系統
- 審計追蹤

---

## 協作流程

### 完整的用戶創建活動流程

```
步驟 1: 用戶上傳活動海報
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
前端: 選擇圖片文件
    ↓
POST /api/events/upload-image
    ↓
eventRoutes.ts: 路由到控制器
    ↓
upload.single('image'): Multer 解析文件
    ↓
eventController.uploadEventImage()
    ↓
walrusService.validateImageFile(): 驗證文件
    ↓
walrusService.uploadToWalrus(): 上傳到 Walrus
    ↓
返回: { blobId: "abc123...", imageUrl: "https://..." }


步驟 2: 用戶在前端填寫活動信息
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
前端表單:
- 名稱: "五月天演唱會"
- 地點: "台北小巨蛋"
- 日期: 2025-05-20
- 座位數: 1000
- 票價: 0.5 SUI
- 圖片: 使用步驟 1 的 blobId


步驟 3: 前端調用 Sui 區塊鏈創建活動
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
前端 (使用 @mysten/dapp-kit):
    ↓
構建交易:
sui client call \
    --package $PACKAGE_ID \
    --module event \
    --function create_event \
    --args $REGISTRY_ID "五月天演唱會" ...
    ↓
用戶錢包簽名
    ↓
交易提交到 Sui 區塊鏈
    ↓
Sui 執行 event.move::create_event()
    ↓
創建 Event 對象
    ↓
發射 EventCreated 事件


步驟 4: 後端監聽並同步數據
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
後端服務器啟動時:
suiClient.subscribeEvent()
    ↓
監聽 EventCreated 事件
    ↓
收到事件通知:
{
    event_id: "0xabc123...",
    organizer: "0xdef456...",
    name: "五月天演唱會",
    ...
}
    ↓
調用 eventService.syncEventFromChain()
    ↓
從區塊鏈讀取完整數據
    ↓
寫入 PostgreSQL:
INSERT INTO events (id, name, ...) VALUES (...)
    ↓
記錄日誌:
logger.info('Event synced', { eventId })


步驟 5: 前端查詢活動列表
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
前端: GET /api/events?upcoming=true
    ↓
eventRoutes.ts: 路由
    ↓
validateEventQuery: 驗證參數
    ↓
eventController.getAllEvents()
    ↓
eventService.getAllEvents({ upcoming: true })
    ↓
查詢數據庫:
SELECT * FROM events 
WHERE date > NOW() AND is_active = true
    ↓
返回 JSON:
{
    success: true,
    data: [
        {
            id: "0xabc123...",
            name: "五月天演唱會",
            venue: "台北小巨蛋",
            date: 1716163200000,
            available_seats: 1000,
            price_per_seat: 500000000,
            image_url: "https://walrus.../abc123"
        },
        ...
    ],
    pagination: { page: 1, total: 10 }
}
    ↓
前端顯示活動列表
```

---

### 用戶購票流程 (與 Role 3 協作)

```
步驟 1: 用戶選擇活動和座位
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
前端: 顯示活動詳情
    ↓
GET /api/events/0xabc123...
    ↓
返回活動信息（包含 available_seats）


步驟 2: 用戶確認購買
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
前端調用 Role 3 的 Ticket 合約:
mint_ticket(event_id, seat_number, ...)
    ↓
Ticket 合約調用 Event 合約:
event::reserve_seats(event, seat_count)
    ↓
Event 合約減少可用座位:
event.available_seats = event.available_seats - 1
    ↓
發射 SeatsReserved 事件


步驟 3: 後端同步座位數
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
後端監聽 SeatsReserved 事件
    ↓
更新數據庫:
UPDATE events 
SET available_seats = available_seats - 1
WHERE id = '0xabc123...'
    ↓
前端重新查詢時看到更新的座位數
```

---

## 數據流向

### 寫入流程（創建活動）

```
┌─────────┐
│  用戶   │
└────┬────┘
     │ 1. 填寫表單
     ↓
┌──────────────┐
│   前端 UI    │
└──────┬───────┘
       │ 2. 調用 Sui 錢包
       ↓
┌──────────────────┐
│  Sui 區塊鏈      │
│  event.move      │
│  create_event()  │
└──────┬───────────┘
       │ 3. 發射事件
       ↓
┌──────────────────┐
│   後端服務器      │
│   監聽事件       │
└──────┬───────────┘
       │ 4. 寫入數據庫
       ↓
┌──────────────────┐
│  PostgreSQL      │
│  events 表       │
└──────────────────┘
```

### 讀取流程（查詢活動）

```
┌─────────┐
│  用戶   │
└────┬────┘
     │ 1. 打開頁面
     ↓
┌──────────────┐
│   前端 UI    │
└──────┬───────┘
       │ 2. GET /api/events
       ↓
┌──────────────────┐
│   後端 API       │
│   eventRoutes    │
│   eventController│
│   eventService   │
└──────┬───────────┘
       │ 3. SQL 查詢
       ↓
┌──────────────────┐
│  PostgreSQL      │  ← 快速！
│  返回結果        │
└──────┬───────────┘
       │ 4. JSON 響應
       ↓
┌──────────────┐
│   前端 UI    │
│   顯示列表   │
└──────────────┘
```

**為什麼不直接查區塊鏈？**
- 區塊鏈查詢慢（幾秒）
- 數據庫查詢快（幾毫秒）
- 區塊鏈查詢需要 Gas 費
- 數據庫免費

---

## 實際運行範例

### 範例 1: 創建活動的完整追蹤

#### 時間軸

```
T+0s: 用戶點擊「創建活動」
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
控制台: "User initiated event creation"


T+0.5s: 上傳圖片到 Walrus
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
walrusService.ts:
→ uploadToWalrus(buffer)
← 返回: "blob_xyz789"

logs/combined.log:
[INFO] File uploaded to Walrus: blob_xyz789


T+1s: 構建區塊鏈交易
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
前端構建交易:
{
    packageId: "0xabc...",
    module: "event",
    function: "create_event",
    arguments: [
        REGISTRY_ID,
        "五月天演唱會",
        "精彩演出",
        "台北小巨蛋",
        1716163200000,  // 2024-05-20
        1000,           // 座位數
        500000000,      // 0.5 SUI
        "blob_xyz789",  // 圖片
        CLOCK_ID
    ]
}


T+2s: 用戶簽名交易
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sui 錢包彈出:
"確認創建活動？
 Gas 費: 0.001 SUI"

用戶點擊「確認」


T+3s: 交易提交到 Sui
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sui Testnet:
→ 驗證交易
→ 執行 event.move::create_event()
→ 創建 Event 對象 (ID: 0xevent123...)
→ 發射 EventCreated 事件


T+3.5s: 後端收到事件
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suiClient.ts:
subscribeEvent() 收到通知:
{
    type: "EventCreated",
    event_id: "0xevent123...",
    organizer: "0xuser456...",
    name: "五月天演唱會",
    ...
}

logs/combined.log:
[INFO] New event created: 0xevent123...


T+4s: 同步到數據庫
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
eventService.ts:
→ syncEventFromChain("0xevent123...")
→ getEventFromChain("0xevent123...")
→ parseEventContent()
→ upsertEvent()

database.ts:
→ INSERT INTO events (...)

PostgreSQL:
✓ 插入成功

logs/combined.log:
[INFO] Event synced to database: 0xevent123...


T+5s: 前端查詢到新活動
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
前端: GET /api/events

eventController.ts:
→ getAllEvents()

eventService.ts:
→ query("SELECT * FROM events...")

PostgreSQL:
→ 返回包含新活動的列表

前端:
✓ 顯示「五月天演唱會」
```

---

### 範例 2: API 請求的完整路徑

**請求**: `GET /api/events?search=演唱會&page=1&limit=10`

```
1️⃣ Express 接收請求
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src/index.ts:
app.use('/api/events', eventRoutes)
↓
匹配到路由


2️⃣ 路由處理
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src/routes/eventRoutes.ts:
router.get('/', 
    validateEventQuery,           ← 執行驗證
    eventController.getAllEvents  ← 執行控制器
)


3️⃣ 驗證中間件
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src/middleware/validation.ts:
validateEventQuery 檢查:
✓ page = 1 (合法)
✓ limit = 10 (合法)
✓ search = "演唱會" (合法)
→ 通過驗證


4️⃣ 控制器
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src/controllers/eventController.ts:
export async function getAllEvents(req, res) {
    const options = {
        page: 1,
        limit: 10,
        search: "演唱會"
    };
    
    const result = await eventService.getAllEvents(options);
    
    res.json({
        success: true,
        data: result.events,
        pagination: result.pagination
    });
}


5️⃣ 服務層
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src/services/eventService.ts:
export async function getAllEvents(options) {
    // 構建 SQL
    const sql = `
        SELECT * FROM events
        WHERE name ILIKE $1
        ORDER BY date DESC
        LIMIT $2 OFFSET $3
    `;
    
    // 執行查詢
    const result = await query(sql, [
        '%演唱會%',  // 搜尋條件
        10,          // limit
        0            // offset
    ]);
    
    return {
        events: result.rows,
        pagination: { page: 1, total: 5 }
    };
}


6️⃣ 數據庫層
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src/services/database.ts:
export async function query(sql, params) {
    const result = await pool.query(sql, params);
    return result;
}

PostgreSQL 執行:
SELECT * FROM events
WHERE name ILIKE '%演唱會%'
ORDER BY date DESC
LIMIT 10 OFFSET 0;

返回:
[
    { id: "0x123", name: "五月天演唱會", ... },
    { id: "0x456", name: "周杰倫演唱會", ... },
    ...
]


7️⃣ 日誌記錄
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src/utils/logger.ts:
logger.info('Query executed', {
    sql: 'SELECT * FROM events...',
    duration: 15,  // 15ms
    rows: 5
});


8️⃣ 返回響應
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HTTP/1.1 200 OK
Content-Type: application/json

{
    "success": true,
    "data": [
        {
            "id": "0x123...",
            "name": "五月天演唱會",
            "venue": "台北小巨蛋",
            "date": 1716163200000,
            "available_seats": 850,
            "price_per_seat": 500000000,
            "image_url": "https://walrus.../abc123"
        },
        ...
    ],
    "pagination": {
        "page": 1,
        "limit": 10,
        "total": 5,
        "totalPages": 1
    }
}


9️⃣ 前端顯示
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
前端收到 JSON 並渲染:

┌────────────────────────────┐
│ 五月天演唱會                │
│ 台北小巨蛋 | 2024-05-20    │
│ 剩餘座位: 850              │
│ 票價: 0.5 SUI              │
│ [購買按鈕]                 │
└────────────────────────────┘
```

---

## 關鍵文件依賴圖

```
┌─────────────────────────────────────────────┐
│           event.move (智能合約)              │
│  - 定義 Event 結構                           │
│  - 實現業務邏輯                              │
│  - 發射區塊鏈事件                            │
└───────────────┬─────────────────────────────┘
                │
                │ 被調用
                ↓
┌─────────────────────────────────────────────┐
│        suiClient.ts (Sui 交互層)            │
│  - 讀取區塊鏈數據                            │
│  - 監聽事件                                  │
│  - 解析合約數據                              │
└───────────────┬─────────────────────────────┘
                │
                │ 調用
                ↓
┌─────────────────────────────────────────────┐
│       eventService.ts (業務邏輯層)          │
│  - 數據轉換                                  │
│  - 業務規則                                  │
│  - 調用數據庫                                │
└───────────────┬─────────────────────────────┘
                │
                │ 被調用
                ↓
┌─────────────────────────────────────────────┐
│     eventController.ts (控制器層)           │
│  - 處理 HTTP 請求                            │
│  - 格式化響應                                │
│  - 錯誤處理                                  │
└───────────────┬─────────────────────────────┘
                │
                │ 被路由
                ↓
┌─────────────────────────────────────────────┐
│       eventRoutes.ts (路由層)               │
│  - 定義 API 端點                             │
│  - 註冊中間件                                │
└───────────────┬─────────────────────────────┘
                │
                │ 被註冊
                ↓
┌─────────────────────────────────────────────┐
│           index.ts (應用入口)               │
│  - 啟動服務器                                │
│  - 註冊路由                                  │
│  - 全局配置                                  │
└─────────────────────────────────────────────┘
```

---

## 總結：文件協作的黃金法則

### 1. 單一職責原則
每個文件只做一件事：
- `event.move` → 只管理活動邏輯
- `suiClient.ts` → 只處理區塊鏈交互
- `eventController.ts` → 只處理 HTTP 請求

### 2. 依賴倒置
- 高層（Controller）依賴低層（Service）的抽象
- Service 不知道 Controller 的存在
- 便於測試和維護

### 3. 數據流動方向
```
請求 → 路由 → 驗證 → 控制器 → 服務 → 數據庫
響應 ← 路由 ← 格式化 ← 控制器 ← 服務 ← 數據庫
```

### 4. 錯誤處理鏈
```
錯誤發生 → try-catch → next(error) → errorHandler → 日誌
```

### 5. 配置集中化
```
所有配置 → config/index.ts → 統一管理
```

---

希望這份詳細說明能幫助你理解每個文件的作用和它們之間的協作關係！

有任何具體的文件或流程想深入了解嗎？
