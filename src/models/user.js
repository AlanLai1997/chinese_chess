// models/user.js
const db = require("../config/database");
const bcrypt = require("bcrypt");

class User {
  static async findById(id) {
    const result = await db.query(
      "SELECT id, username, email, rating FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    return result.rows[0];
  }

  static async create({ username, email, password }) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, rating)
       VALUES ($1, $2, $3, 1200)
       RETURNING id, username, email, rating`,
      [username, email, passwordHash]
    );

    return result.rows[0];
  }

  static async updateRating(userId, newRating) {
    const result = await db.query(
      "UPDATE users SET rating = $1 WHERE id = $2 RETURNING rating",
      [newRating, userId]
    );
    return result.rows[0];
  }

  static async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password_hash);
  }
}

module.exports = User;
