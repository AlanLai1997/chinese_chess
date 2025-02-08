// src/routes/auth.js

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const passport = require("passport");
const bcrypt = require("bcrypt");
const db = require("../config/database");

// 本地登入
router.post("/login", authController.login);

// 本地註冊
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 檢查用戶名是否已存在
    const userCheck = await db.query(
      "SELECT * FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: "用戶名或電子郵件已被使用" });
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);

    // 插入新用戶
    const result = await db.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
      [username, email, hashedPassword]
    );

    // 創建用戶戰績記錄
    await db.query(
      "INSERT INTO user_stats (user_id, wins, losses, rating) VALUES ($1, $2, $3, $4)",
      [result.rows[0].id, 0, 0, 1500]
    );

    // 使用 passport 登入用戶
    req.login(result.rows[0], (err) => {
      if (err) {
        console.error("登入錯誤:", err);
        return res.status(500).json({ error: "登入失敗" });
      }
      res.json({ message: "註冊成功" });
    });
  } catch (error) {
    console.error("註冊錯誤:", error);
    res.status(500).json({ error: "註冊失敗" });
  }
});

// Google OAuth 路由
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth 回調
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    failureMessage: true,
  }),
  (req, res) => {
    console.log("Google 認證成功，用戶:", req.user);
    res.redirect("/game");
  }
);

// 登出
router.get("/logout", authController.logout);

// 檢查登入狀態
router.get("/check", (req, res) => {
  if (req.isAuthenticated()) {
    console.log("用戶已登入:", req.user);
    res.json({
      isAuthenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
      },
    });
  } else {
    console.log("用戶未登入");
    res.json({
      isAuthenticated: false,
      message: "未登入或會話已過期",
    });
  }
});

module.exports = router;
