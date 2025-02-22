## 注意事項

1. 確保 PostgreSQL 服務已啟動
2. 正確配置 Google OAuth 憑證
3. 設置所有必要的環境變數
4. 首次登入時會自動創建用戶帳號

## 雲端部署

### Railway 部署

1. **準備工作**

   - 註冊 [Railway](https://railway.app/) 帳號
   - 安裝 Railway CLI: `npm i -g @railway/cli`
   - 登入: `railway login`

2. **創建 Railway 專案**

   ```bash
   railway init
   ```

3. **添加 PostgreSQL 服務**

   - 在 Railway 控制台中添加 PostgreSQL
   - Railway 會自動設置數據庫環境變數

4. **設置環境變數**

   ```bash
   railway vars set GOOGLE_CLIENT_ID=你的ID
   railway vars set GOOGLE_CLIENT_SECRET=你的密鑰
   railway vars set SESSION_SECRET=你的session密鑰
   ```

5. **部署應用**
   ```bash
   railway up
   ```

### Heroku 部署

1. **準備工作**

   - 註冊 [Heroku](https://heroku.com) 帳號
   - 安裝 [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
   - 登入: `heroku login`

2. **創建 Heroku 應用**

   ```bash
   heroku create your-app-name
   ```

3. **添加 PostgreSQL**

   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

4. **設置環境變數**

   ```bash
   heroku config:set GOOGLE_CLIENT_ID=你的ID
   heroku config:set GOOGLE_CLIENT_SECRET=你的密鑰
   heroku config:set SESSION_SECRET=你的session密鑰
   ```

5. **部署代碼**

   ```bash
   git push heroku main
   ```

6. **初始化數據庫**
   ```bash
   heroku pg:psql < database/init.sql
   ```

### 重要提醒

1. 更新 Google OAuth 設置

   - 添加新的授權重定向 URI: `https://你的域名/api/auth/google/callback`

2. 確保環境變數

   - 檢查所有必要的環境變數都已設置
   - 數據庫連接字符串會自動由平台提供

3. CORS 和安全設置

   - 更新 CORS 設置以匹配新域名
   - 確保使用 HTTPS

4. 監控和日誌
   - 使用平台提供的日誌查看工具
   - 設置錯誤通知
