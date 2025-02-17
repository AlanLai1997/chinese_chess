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
        socket.emit("auth_error", { message: "未提供用戶ID" });
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
      console.log("gameSocket 收到投降事件:", data);
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

    socket.on("gameOver", (data) => {
      if (!isAuthenticated) return;
      handler.handleGameOver(data);
    });

    // 監聽重連事件
    socket.on("reconnect", () => {
      handler.handleReconnect(socket);
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

module.exports = setupGameSocket;
