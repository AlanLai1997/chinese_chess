// models/game.js
const db = require("../config/database");

class Game {
  static async create({ gameId, winnerId, endReason, moves }) {
    const query = `
      INSERT INTO games (game_id, winner_id, end_reason, moves)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [gameId, winnerId, endReason, JSON.stringify(moves || [])];

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error("Error creating game record:", error);
      throw error;
    }
  }

  static async getRecentGames(userId, limit = 10) {
    const query = `
      SELECT g.*, 
        u.username as winner_name
      FROM games g
      LEFT JOIN users u ON g.winner_id = u.id
      WHERE g.winner_id = $1 OR g.game_id IN (
        SELECT game_id FROM games WHERE winner_id != $1
      )
      ORDER BY g.created_at DESC
      LIMIT $2
    `;

    const result = await db.query(query, [userId, limit]);
    return result.rows;
  }

  static async getUserStats(userId) {
    const query = `
      SELECT 
        COUNT(*) as total_games,
        SUM(CASE WHEN winner_id = $1 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN winner_id != $1 THEN 1 ELSE 0 END) as losses
      FROM games
      WHERE winner_id = $1 OR game_id IN (
        SELECT game_id FROM games WHERE winner_id != $1
      )
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  }
}

module.exports = Game;
