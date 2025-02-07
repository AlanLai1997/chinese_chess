require("dotenv").config();
const express = require("express");
const path = require("path");
const passport = require("passport");
const session = require("express-session");
const gameRoutes = require("./src/routes/game");
const authRoutes = require("./src/routes/auth");
const userRoutes = require("./src/routes/user");
const http = require("http");
const socketIO = require("socket.io");
const app = express();
const server = http.createServer(app); // 創建 HTTP server
const io = socketIO(server); // 初始化 Socket.IO
const setupGameSocket = require("./src/websocket/gameSocket");
const PORT = process.env.PORT || 3000;
const User = require("./src/models/user");
const db = require("./src/config/database");
const pgSession = require("connect-pg-simple")(session);

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
      },
      store: new pgSession({
        pool: db.pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // 路由
  app.use("/api/game", gameRoutes);
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

  // Google OAuth 路由
  app.get(
    "/api/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
    })
  );

  // Google OAuth 回調路由
  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/login",
      failureMessage: true,
    }),
    (req, res) => {
      res.redirect("/game");
    }
  );

  // 登出路由
  app.get("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("登出錯誤:", err);
        return res.status(500).json({ message: "登出過程中發生錯誤" });
      }
      res.redirect("/login");
    });
  });

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

passport.serializeUser((user, done) => {
  console.log("序列化用戶:", user);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  console.log("反序列化用戶 ID:", id);
  try {
    const result = await db.query(
      "SELECT id, username, email, rating FROM users WHERE id = $1",
      [id]
    );
    if (result.rows[0]) {
      done(null, result.rows[0]);
    } else {
      done(new Error("用戶未找到"), null);
    }
  } catch (error) {
    console.error("反序列化錯誤:", error);
    done(error, null);
  }
});
