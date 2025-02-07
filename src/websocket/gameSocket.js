const GameEventHandler = require("../handlers/GameEventHandler");
const db = require("../config/database");

function setupGameSocket(io) {
  const gameStates = new Map();
  const onlineUsers = new Map();
  const waitingPlayers = new Set();

  const handler = new GameEventHandler(
    io,
    gameStates,
    onlineUsers,
    waitingPlayers
  );

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("auth", (userId) => {
      console.log("Auth attempt with userId:", userId);
      handler.handleAuth(socket, userId);
    });

    socket.on("findMatch", () => {
      console.log("收到配對請求:", socket.id);
      handler.handleFindMatch(socket);
    });

    socket.on("makeMove", (data) => {
      console.log("收到移動請求:", data);
      handler.handleMove(socket, data);
    });

    socket.on("surrender", (data) => handler.handleSurrender(socket, data));

    socket.on("disconnect", () => {
      console.log("連接斷開:", socket.id);
      handler.handleDisconnect(socket);
    });

    socket.on("cancelMatch", () => handler.handleCancelMatch(socket));

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    socket.on("gameOver", async (data) => {
      const { winner, loser } = data;
      await updateUserStats(winner.id, true);
      await updateUserStats(loser.id, false);
      // ... 其他遊戲結束邏輯 ...
    });
  });
}

async function updateUserStats(userId, isWinner) {
  try {
    const result = await db.query(
      "SELECT wins, losses, rating FROM user_stats WHERE user_id = $1",
      [userId]
    );
    const stats = result.rows;

    if (stats.length === 0) {
      // 創建初始記錄
      await db.query(
        "INSERT INTO user_stats (user_id, wins, losses, rating) VALUES ($1, $2, $3, $4)",
        [userId, isWinner ? 1 : 0, isWinner ? 0 : 1, 1500]
      );
      return;
    }

    if (isWinner) {
      await db.query(
        "UPDATE user_stats SET wins = wins + 1, rating = rating + 25 WHERE user_id = $1",
        [userId]
      );
    } else {
      await db.query(
        "UPDATE user_stats SET losses = losses + 1, rating = GREATEST(rating - 25, 0) WHERE user_id = $1",
        [userId]
      );
    }
  } catch (error) {
    console.error("更新用戶戰績失敗:", error);
  }
}

module.exports = setupGameSocket;
