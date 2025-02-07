// src/db/gameOperations.js

const db = require("../config/database");

// 記錄遊戲結果
async function recordGame(userId, opponentId, result, ratingChange) {
  try {
    await db.query(
      "INSERT INTO games (user_id, opponent_id, result, rating_change) VALUES ($1, $2, $3, $4)",
      [userId, opponentId, result, ratingChange]
    );

    // 更新用戶積分
    await db.query("UPDATE users SET rating = rating + $1 WHERE id = $2", [
      ratingChange,
      userId,
    ]);

    // 如果是與真實玩家對戰，也要更新對手的積分
    if (opponentId) {
      await db.query("UPDATE users SET rating = rating - $1 WHERE id = $2", [
        ratingChange,
        opponentId,
      ]);
    }

    return true;
  } catch (error) {
    console.error("記錄遊戲結果錯誤:", error);
    return false;
  }
}

// 獲取用戶積分
async function getUserRating(userId) {
  try {
    const result = await db.query("SELECT rating FROM users WHERE id = $1", [
      userId,
    ]);
    return result.rows[0].rating;
  } catch (error) {
    console.error("獲取用戶積分錯誤:", error);
    return null;
  }
}

// 獲取用戶的遊戲歷史
async function getGameHistory(userId, limit = 10) {
  try {
    const result = await db.query(
      `SELECT 
                g.*,
                u.username as opponent_name
             FROM games g
             LEFT JOIN users u ON g.opponent_id = u.id
             WHERE g.user_id = $1
             ORDER BY g.date DESC
             LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error("獲取遊戲歷史錯誤:", error);
    return [];
  }
}

// 更新用戶遊戲設置
async function updateGameSettings(userId, settings) {
  try {
    await db.query(
      `INSERT INTO game_settings (user_id, sound_enabled, animation_enabled)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) 
             DO UPDATE SET 
                sound_enabled = $2,
                animation_enabled = $3,
                updated_at = CURRENT_TIMESTAMP`,
      [userId, settings.soundEnabled, settings.animationEnabled]
    );
    return true;
  } catch (error) {
    console.error("更新遊戲設置錯誤:", error);
    return false;
  }
}

// 獲取用戶遊戲設置
async function getGameSettings(userId) {
  try {
    const result = await db.query(
      "SELECT sound_enabled, animation_enabled FROM game_settings WHERE user_id = $1",
      [userId]
    );
    return result.rows[0] || { sound_enabled: true, animation_enabled: true };
  } catch (error) {
    console.error("獲取遊戲設置錯誤:", error);
    return { sound_enabled: true, animation_enabled: true };
  }
}

module.exports = {
  recordGame,
  getUserRating,
  getGameHistory,
  updateGameSettings,
  getGameSettings,
};
