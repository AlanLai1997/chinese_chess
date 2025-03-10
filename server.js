require("dotenv").config();
const express = require("express");
const path = require("path");
const passport = require("./src/config/passportConfig");
const session = require("express-session");
const authRoutes = require("./src/routes/auth");
const userRoutes = require("./src/routes/user");
const http = require("http");
const socketIO = require("socket.io");
const app = express();
const server = http.createServer(app); // 創建 HTTP server
const io = socketIO(server);
const setupGameSocket = require("./src/websocket/gameSocket");
const PORT = 3000;
const db = require("./src/config/database");
const pgSession = require("connect-pg-simple")(session);

// 檢查環境變數
console.log("=== 環境變數檢查 (server.js) ===");
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("================================");

// 中間件設置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// 添加創建 session 表的函數
async function createSessionTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")
    `);

    console.log("Session table created successfully");
  } catch (error) {
    console.error("Error creating session table:", error);
  }
}

// 在啟動服務器之前創建表
createSessionTable().then(() => {
  // Session 配置
  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 小時
        httpOnly: true,
        sameSite: "none", // 允許跨站點 cookie
      },
      store: new pgSession({
        pool: db.pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
    })
  );

  // 在生產環境中信任代理
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(passport.initialize());
  app.use(passport.session());

  // // 路由
  app.use("/api/auth", authRoutes);
  app.use("/api/user", userRoutes);

  // 添加頁面路由處理
  app.get("/", (req, res) => {
    if (req.isAuthenticated()) {
      res.redirect("/game");
    } else {
      res.redirect("/login");
    }
  });

  app.get("/login", (req, res) => {
    if (req.isAuthenticated()) {
      res.redirect("/game");
    } else {
      res.sendFile(path.join(__dirname, "views/login.html"));
    }
  });

  app.get("/register", (req, res) => {
    if (req.isAuthenticated()) {
      res.redirect("/game");
    } else {
      res.sendFile(path.join(__dirname, "views/register.html"));
    }
  });

  app.get("/game", (req, res) => {
    if (req.isAuthenticated()) {
      res.sendFile(path.join(__dirname, "views/game.html"));
    } else {
      res.redirect("/login");
    }
  });

  app.get("/profile", (req, res) => {
    if (req.isAuthenticated()) {
      res.sendFile(path.join(__dirname, "views/profile.html"));
    } else {
      res.redirect("/login");
    }
  });

  // 登出路由

  setupGameSocket(io);
  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});

// 在所有路由之後添加錯誤處理中間件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    message: "服務器內部錯誤",
  });
});

module.exports = app;
