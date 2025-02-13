// src/routes/user.js

const express = require("express");
const router = express.Router();
const db = require("../config/database");

// 獲取用戶資料
router.get("/profile", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "未登入" });
  }

  try {
    const userQuery = await db.query(
      "SELECT username, email, rating FROM users WHERE id = $1",
      [req.user.id]
    );

    const statsQuery = await db.query(
      `SELECT wins, losses, rating FROM user_stats WHERE user_id = $1`,
      [req.user.id]
    );

    const user = userQuery.rows[0];
    const stats = statsQuery.rows[0];

    res.json({
      username: user.username,
      email: user.email,
      rating: stats.rating,
      stats: {
        totalGames: parseInt(stats.wins, 10) + parseInt(stats.losses, 10),
        wins: parseInt(stats.wins, 10),
        losses: parseInt(stats.losses, 10),
        draws: 0,
      },
    });
  } catch (error) {
    console.error("獲取用戶資料錯誤:", error);
    res.status(500).json({ message: "獲取用戶資料失敗" });
  }
});

// 獲取對戰歷史
// router.get("/game-history", async (req, res) => {
//   if (!req.isAuthenticated()) {
//     return res.status(401).json({ message: "未登入" });
//   }

//   try {
//     const historyQuery = await db.query(
//       `SELECT
//         g.created_at,
//         u2.username as opponent,
//         g.result,
//         g.rating_change
//        FROM games g
//        LEFT JOIN users u2 ON g.opponent_id = u2.id
//        WHERE g.user_id = $1
//        ORDER BY g.date DESC
//        LIMIT 10`,
//       [req.user.id]
//     );

//     res.json({
//       history: historyQuery.rows.map((game) => ({
//         date: game.created_at,
//         opponent: game.opponent,
//         result: game.result,
//         ratingChange: game.rating_change,
//       })),
//     });
//   } catch (error) {
//     console.error("獲取對戰歷史錯誤:", error);
//     res.status(500).json({ message: "獲取對戰歷史失敗" });
//   }
// });

router.get("/current", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "未登入" });
  }
  res.json({ id: req.user.id });
});

// 獲取用戶戰績
router.get("/stats", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "未登入" });
  }

  try {
    const userId = req.user.id;
    const query = `
      SELECT 
        wins,
        losses,
        rating
      FROM user_stats 
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);
    const stats = result.rows;

    if (stats.length === 0) {
      // 如果沒有記錄，創建初始記錄
      const initialStats = {
        wins: 0,
        losses: 0,
        rating: 1500, // 初始積分
      };

      await db.query(
        `
        INSERT INTO user_stats (user_id, wins, losses, rating)
        VALUES ($1, $2, $3, $4)
        `,
        [userId, 0, 0, 1500]
      );

      res.json(initialStats);
    } else {
      res.json(stats[0]);
    }
  } catch (error) {
    console.error("獲取用戶戰績失敗:", error);
    res.status(500).json({ error: "獲取戰績失敗" });
  }
});

module.exports = router;
