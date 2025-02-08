// src/controllers/authController.js
const bcrypt = require("bcrypt");
const {
  validateEmail,
  validateUsername,
  validatePassword,
} = require("../utils/ratingCalculator");
const db = require("../config/database");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// 配置 Passport
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query(
      "SELECT id, username, email, rating FROM users WHERE id = $1",
      [id]
    );
    done(null, result.rows[0]);
  } catch (error) {
    done(error);
  }
});

// 配置 Google 策略
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        const email = profile.emails[0].value;
        console.log("Google 登入資料:", { email, profile });

        // 檢查用戶是否已存在
        let result = await db.query(
          "SELECT * FROM users WHERE google_id = $1 OR email = $2",
          [profile.id, email]
        );

        if (result.rows.length > 0) {
          // 更新現有用戶的 google_id（如果需要）
          if (!result.rows[0].google_id) {
            await db.query("UPDATE users SET google_id = $1 WHERE email = $2", [
              profile.id,
              email,
            ]);
          }
          console.log("現有用戶登入成功");
          return done(null, result.rows[0]);
        }

        // 創建新用戶
        result = await db.query(
          `INSERT INTO users (
            username,
            email,
            google_id,
            rating
          ) VALUES ($1, $2, $3, 1200)
          RETURNING id, username, email, rating`,
          [profile.displayName, email, profile.id]
        );

        console.log("新用戶創建成功");
        done(null, result.rows[0]);
      } catch (error) {
        console.error("Google 認證錯誤:", error);
        done(error, null);
      }
    }
  )
);

// 註冊控制器
exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  // 輸入驗證
  if (!validateUsername(username)) {
    return res.status(400).json({
      message: "用戶名必須是3-20個字符，只能包含字母、數字、底線和中文",
    });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({
      message: "請輸入有效的電子郵件地址",
    });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      message: "密碼長度必須至少為6個字符",
    });
  }

  try {
    // 檢查電子郵件是否已被使用
    const emailCheck = await db.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        message: "此電子郵件已被註冊",
      });
    }

    // 檢查用戶名是否已被使用
    const usernameCheck = await db.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (usernameCheck.rows.length > 0) {
      return res.status(400).json({
        message: "此用戶名已被使用",
      });
    }

    // 密碼加密
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 創建用戶
    const result = await db.query(
      `INSERT INTO users (
        username,
        email,
        password_hash,
        rating
      ) VALUES ($1, $2, $3, 1200)
      RETURNING id, username, email, rating`,
      [username, email, passwordHash]
    );

    // 創建用戶的遊戲設置
    await db.query(
      `INSERT INTO game_settings (
        user_id,
        sound_enabled,
        animation_enabled
      ) VALUES ($1, true, true)`,
      [result.rows[0].id]
    );

    // 自動登入
    req.login(result.rows[0], (err) => {
      if (err) {
        return res.status(500).json({
          message: "註冊成功但自動登入失敗，請手動登入",
        });
      }
      res.json({
        message: "註冊成功",
        user: {
          id: result.rows[0].id,
          username: result.rows[0].username,
          email: result.rows[0].email,
        },
      });
    });
  } catch (error) {
    console.error("註冊錯誤:", error);
    res.status(500).json({
      message: "註冊過程中發生錯誤，請稍後再試",
    });
  }
};

// 登入控制器
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 驗證輸入
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "請輸入電子郵件和密碼",
      });
    }

    // 查找用戶
    const result = await db.query(
      "SELECT id, username, email, password_hash FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "用戶不存在" });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "密碼錯誤",
      });
    }

    // 登入成功，設置 session
    req.login(user, (err) => {
      if (err) {
        console.error("Session 設置錯誤:", err);
        return res.status(500).json({
          success: false,
          message: "登入過程中發生錯誤",
        });
      }

      // 返回成功響應
      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
        },
      });
    });
  } catch (error) {
    console.error("登入錯誤:", error);
    res.status(500).json({
      success: false,
      message: "登入過程中發生錯誤",
    });
  }
};

// 登出控制器
exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("登出錯誤:", err);
      return res.status(500).json({ message: "登出過程中發生錯誤" });
    }
    res.redirect("/login");
  });
};

// 獲取當前用戶信息
exports.getCurrentUser = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.json({
      isAuthenticated: false,
    });
  }

  res.json({
    isAuthenticated: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      rating: req.user.rating,
    },
  });
};

// 中間件：確保用戶已登入
exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({
    message: "請先登入",
  });
};

// 中間件：確保用戶未登入
exports.ensureNotAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.status(400).json({
    message: "您已經登入",
  });
};

// 添加新的路由處理程序
exports.googleCallback = (req, res) => {
  // 確保用戶已經通過認證
  if (!req.user) {
    return res.redirect("/login");
  }
  res.redirect("/game");
};
