# 中國象棋 Online

這是一個基於 Node.js 和 Socket.IO 的線上中國象棋遊戲。

## 系統需求

- Node.js (v14.0.0 或更高版本)
- PostgreSQL (v12.0 或更高版本)
- npm (Node.js 包管理器)

## 安裝步驟

1. 克隆專案

```bash
git clone <repository-url>
cd chinese_chess
```

2. 安裝依賴

```bash
npm install
```

3. 設置環境變數
   創建 `.env` 文件在專案根目錄，並添加以下配置：

```env
# 資料庫設定(postgresql)
DB_HOST=localhost
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=chinese_chess

# 伺服器設定
PORT=your_port(4000)

# Google OAuth 設定
GOOGLE_CLIENT_ID="your google client id"
GOOGLE_CLIENT_SECRET="your google client secret"
```

4. 初始化數據庫

```bash
# 登入到 PostgreSQL
psql -U your_username

# 創建數據庫
CREATE DATABASE chinese_chess;

# 執行 migrations 文件
psql -U your_username -d chinese_chess -f migrations/create_users_table.sql
psql -U your_username -d chinese_chess -f migrations/create_user_stats_table.sql
# 自動更新時間戳觸發器已包含在表創建腳本中
```

## 運行應用

1. 啟動服務器

```bash
npm start(nodemon server.js)
```

2. 運行測試

```bash
npm test
```

## 功能特點

- 即時對戰
- 玩家配對系統
- 斷線重連機制
- 遊戲狀態同步
- 超時處理

## 注意事項

- 確保 PostgreSQL 服務正在運行
- 檢查環境變數配置是否正確
- 確保所需端口未被占用

## 常見問題

1. 數據庫連接失敗

   - 檢查 PostgreSQL 服務是否運行
   - 驗證數據庫憑證是否正確

2. 端口被占用
   - 修改 `.env` 文件中的 PORT 值
   - 或關閉占用端口的程序
