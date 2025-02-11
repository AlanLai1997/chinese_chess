const GameEventHandler = require("../handlers/GameEventHandler");
const db = require("../config/database");

function setupGameSocket(io) {
  // 配置 Socket.IO
  io.engine.pingTimeout = 60000; // 60 秒超时
  io.engine.pingInterval = 25000; // 25 秒ping间隔

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
    // 只在用户认证后才记录连接
    let isAuthenticated = false;

    socket.on("auth", (userId) => {
      if (!userId) {
        console.log("Auth failed: No userId provided");
        return;
      }

      isAuthenticated = true;
      console.log(`User ${userId} authenticated with socket ${socket.id}`);
      handler.handleAuth(socket, userId);
    });

    socket.on("findMatch", () => {
      if (!isAuthenticated) return;
      console.log("收到配對請求:", socket.id);
      handler.handleFindMatch(socket);
    });

    socket.on("makeMove", (data) => {
      if (!isAuthenticated) return;
      console.log("收到移動請求:", data);
      handler.handleMove(socket, data);
    });

    socket.on("surrender", (data) => {
      if (!isAuthenticated) return;
      handler.handleSurrender(socket, data);
    });

    socket.on("disconnect", () => {
      if (!isAuthenticated) return;
      console.log("連接斷開:", socket.id);
      handler.handleDisconnect(socket);
    });

    socket.on("cancelMatch", () => {
      if (!isAuthenticated) return;
      handler.handleCancelMatch(socket);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    socket.on("gameOver", async (data) => {
      const { winner, loser } = data;
      await updateUserStats(winner.id, true);
      await updateUserStats(loser.id, false);
      // ... 其他遊戲結束邏輯 ...
    });

    // 设置连接超时
    setTimeout(() => {
      if (!isAuthenticated) {
        console.log("Unauthenticated connection timeout:", socket.id);
        socket.disconnect(true);
      }
    }, 5000);
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
