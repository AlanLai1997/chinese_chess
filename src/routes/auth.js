// src/routes/auth.js

const express = require("express");
const router = express.Router();
const passport = require("../config/passportConfig");
const {
  register,
  login,
  logout,
  getCurrentUser,
  ensureAuthenticated,
  ensureNotAuthenticated,
  googleCallback,
} = require("../controllers/authController");

// 註冊路由
router.post("/register", ensureNotAuthenticated, register);

// 登入路由
router.post("/login", ensureNotAuthenticated, login);

// 登出路由
router.get("/logout", ensureAuthenticated, logout);

// 獲取當前用戶信息
router.get("/check", getCurrentUser);

// Google OAuth 路由
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth 回調路由
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  googleCallback
);

module.exports = router;
