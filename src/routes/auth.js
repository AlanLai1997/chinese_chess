// src/routes/auth.js

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const passport = require("passport");

// 本地登入
router.post("/login", authController.login);

// 本地註冊
router.post("/register", authController.register);

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
