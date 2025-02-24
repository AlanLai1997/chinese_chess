const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("./database");

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

module.exports = passport;
