// models/stats.js
const db = require("../config/database");

class Stats {
  static async getUserStats(userId) {
    const result = await db.query(
      `SELECT 
        u.rating,
        COUNT(g.*) as total_games,
        SUM(CASE WHEN g.result = 'win' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN g.result = 'loss' THEN 1 ELSE 0 END) as losses,
        SUM(CASE WHEN g.result = 'draw' THEN 1 ELSE 0 END) as draws,
        COALESCE(AVG(g.rating_change), 0) as avg_rating_change
       FROM users u
       LEFT JOIN games g ON u.id = g.user_id
       WHERE u.id = $1
       GROUP BY u.id, u.rating`,
      [userId]
    );
    return result.rows[0];
  }

  static async getLeaderboard(limit = 10) {
    const result = await db.query(
      `SELECT 
        u.id,
        u.username,
        u.rating,
        COUNT(g.*) as total_games,
        SUM(CASE WHEN g.result = 'win' THEN 1 ELSE 0 END) as wins
       FROM users u
       LEFT JOIN games g ON u.id = g.user_id
       GROUP BY u.id, u.username, u.rating
       ORDER BY u.rating DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  static async getWinRate(userId) {
    const result = await db.query(
      `SELECT 
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND(SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2)
          ELSE 0 
        END as win_rate
       FROM games
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0].win_rate;
  }
}

module.exports = Stats;
