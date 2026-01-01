# ⚡ 5 分鐘快速啟動指南 - SQLite 版本

## 🎯 目標

5 分鐘內啟動完整的 SuiStage Event Management 系統。

---

## ✅ 前置檢查（1 分鐘）

確認你有：

```bash
# Node.js（必須）
node --version  # 需要 v18+

# Sui CLI（必須）
sui --version

# Git（推薦）
git --version
```

**沒有？** 快速安裝：

```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git sui
```

---

## 🚀 第 1 步：設置 Sui 錢包（1 分鐘）

```bash
# 初始化 Sui
sui client

# 切換到 testnet
sui client switch --env testnet

# 獲取測試幣（重要！）
sui client faucet

# 檢查餘額
sui client gas
```

**看到餘額？** 繼續下一步 ✅

---

## 📦 第 2 步：部署合約（2 分鐘）

```bash
cd contracts

# 編譯
sui move build

# 測試（可選）
sui move test

# 部署
../scripts/deploy.sh
```

**成功後會顯示：**

```
✅ Deployment successful!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PACKAGE_ID=0xabc123...
EVENT_REGISTRY_ID=0xdef456...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**⭐ 複製這兩個值！**

---

## ⚙️ 第 3 步：配置後端（1 分鐘）

```bash
cd ../backend

# 安裝依賴
npm install

# 配置環境
cp .env.example .env
nano .env
```

**只需填入 3 行：**

```bash
PACKAGE_ID=0xabc123...         ← 貼上你的值
EVENT_REGISTRY_ID=0xdef456...  ← 貼上你的值

# 其他保持默認即可
DATABASE_TYPE=sqlite
DATABASE_PATH=./suistage.db
```

保存（Ctrl+O, Enter, Ctrl+X）

---

## 🎉 第 4 步：啟動！（30 秒）

```bash
npm run dev
```

**看到這些信息表示成功：**

```
🚀 Server running on port 3000
🗄️  Initializing SQLite database...
✅ SQLite database initialized successfully
📊 Database stats: 0 events, 0.00 MB
```

---

## ✅ 第 5 步：測試（30 秒）

打開新終端：

```bash
# 測試 1: 健康檢查
curl http://localhost:3000/health

# 應該返回：
{
  "status": "ok",
  "uptime": ...
}

# 測試 2: 獲取活動列表
curl http://localhost:3000/api/events

# 應該返回：
{
  "success": true,
  "data": [],
  "pagination": {...}
}
```

**都成功了？** 🎉 **恭喜！你已經完成了！**

---

## 🎯 下一步：創建第一個活動

### 方法 1: 使用 Sui CLI

```bash
# 設置變數
export PACKAGE_ID=0x...      # 你的 PACKAGE_ID
export REGISTRY_ID=0x...     # 你的 EVENT_REGISTRY_ID
export CLOCK=0x6             # Sui Clock 對象

# 創建活動
sui client call \
  --package $PACKAGE_ID \
  --module event \
  --function create_event \
  --args $REGISTRY_ID \
         "My First Concert" \
         "An amazing live performance" \
         "Taipei Arena" \
         1735689600000 \
         1000 \
         500000000 \
         "image_placeholder" \
         $CLOCK \
  --gas-budget 100000000
```

### 方法 2: 等待前端整合

前端會提供 UI 來創建活動。

---

## 🔍 查看你的活動

```bash
# 同步最近的活動
curl -X POST http://localhost:3000/api/events/sync-recent

# 查看所有活動
curl http://localhost:3000/api/events

# 查看數據庫
sqlite3 suistage.db "SELECT * FROM events;"
```

---

## 📊 常用命令

```bash
# 開發模式（熱重載）
npm run dev

# 生產模式
npm run build
npm start

# 查看日誌
tail -f logs/combined.log

# 備份數據庫
cp suistage.db backups/suistage_$(date +%Y%m%d).db

# 查看數據庫統計
curl http://localhost:3000/api/admin/stats
```

---

## 🐛 遇到問題？

### 問題 1: 部署失敗（Gas 不足）

```bash
# 重新獲取測試幣
sui client faucet

# 等 30 秒後重試
```

### 問題 2: 端口被佔用

```bash
# 修改 .env
PORT=3001

# 或殺掉佔用進程
lsof -ti:3000 | xargs kill -9
```

### 問題 3: 數據庫鎖定

```bash
# 關閉所有終端
# 重新啟動服務
npm run dev
```

### 問題 4: Module 找不到

```bash
# 重新安裝依賴
rm -rf node_modules
npm install
```

---

## 📁 項目結構

```
suistage-role2-sqlite/
├── contracts/
│   ├── Move.toml
│   └── sources/
│       └── event.move        ← 智能合約
│
├── backend/
│   ├── package.json          ← 依賴（SQLite）
│   ├── .env                  ← 你的配置
│   └── src/
│       ├── index.ts          ← 入口
│       ├── services/
│       │   ├── database.ts   ← SQLite
│       │   ├── suiClient.ts  ← 區塊鏈
│       │   └── ...
│       └── ...
│
├── suistage.db               ← 數據庫（自動生成）
└── logs/                     ← 日誌文件
```

---

## 🎓 學習路徑

### Day 1: 啟動系統
- [x] 完成這個快速指南
- [x] 成功啟動服務
- [x] 測試 API

### Day 2: 創建活動
- [ ] 使用 CLI 創建活動
- [ ] 查看數據庫
- [ ] 理解數據同步

### Day 3: 整合前端
- [ ] 前端調用 API
- [ ] 上傳圖片
- [ ] 顯示活動列表

---

## 💡 小技巧

### 1. 自動重啟服務

```bash
# 使用 tsx watch（已配置）
npm run dev

# 修改代碼後自動重啟
```

### 2. 快速備份

```bash
# 創建備份腳本
echo "cp suistage.db backups/\$(date +%Y%m%d_%H%M%S).db" > backup.sh
chmod +x backup.sh

# 運行備份
./backup.sh
```

### 3. 監控日誌

```bash
# 終端 1: 運行服務
npm run dev

# 終端 2: 監控日誌
tail -f logs/combined.log
```

---

## 📋 檢查清單

完成以下所有項目：

- [ ] Node.js 已安裝（v18+）
- [ ] Sui CLI 已安裝
- [ ] Sui 錢包已創建並獲得測試幣
- [ ] 合約已成功部署
- [ ] 獲得了 PACKAGE_ID 和 EVENT_REGISTRY_ID
- [ ] 後端 .env 已配置
- [ ] npm install 成功
- [ ] 服務已啟動
- [ ] API 健康檢查通過
- [ ] 能查詢活動列表

**全部完成？** 🎉 你已經準備好開發了！

---

## 🚀 總時間統計

```
✅ Sui 錢包設置:    1 分鐘
✅ 部署合約:        2 分鐘
✅ 配置後端:        1 分鐘
✅ 啟動服務:        30 秒
✅ 測試 API:        30 秒
━━━━━━━━━━━━━━━━━━━━━━━━━
   總計:           5 分鐘 ✨
```

---

## 🎉 完成！

你現在有一個完整的：
- ✅ Sui Move 智能合約
- ✅ Express.js REST API
- ✅ SQLite 數據庫
- ✅ Walrus 圖片存儲
- ✅ 事件監聽系統
- ✅ 完整的日誌系統

**開始開發吧！** 🚀

有問題？查看 [README.md](./README.md) 或 [完整文檔](./FILE_EXPLANATIONS.md)
