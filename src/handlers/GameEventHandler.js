// handlers/GameEventHandler.js
const User = require("../models/user");
const Game = require("../models/game");
const GameLogic = require("../utils/gameLogic");
const db = require("../config/database");

class GameEventHandler {
  constructor(io, gameStates, onlineUsers, waitingPlayers) {
    this.io = io;
    this.gameStates = gameStates;
    this.onlineUsers = onlineUsers;
    this.waitingPlayers = waitingPlayers;
  }

  // 檢查玩家是否在遊戲中
  isUserInGame(userId) {
    for (const [_, gameState] of this.gameStates) {
      if (
        gameState.players.red === userId ||
        gameState.players.black === userId
      ) {
        return true;
      }
    }
    return false;
  }

  handleAuth(socket, userId) {
    console.log(`User ${userId} authenticated with socket ${socket.id}`);

    // 檢查是否已經有其他連接使用相同的用戶ID
    for (let [socketId, existingUserId] of this.onlineUsers.entries()) {
      if (existingUserId === userId && socketId !== socket.id) {
        console.log(`用戶 ${userId} 在其他地方登入，斷開舊連接`);
        this.io.to(socketId).emit("duplicate_login");
        this.io.sockets.sockets.get(socketId)?.disconnect();
      }
    }

    this.onlineUsers.set(socket.id, userId);
    socket.userId = userId;

    // 通知客戶端認證成功
    socket.emit("auth_success", { userId });
  }

  handleFindMatch(socket) {
    const userId = socket.userId;
    if (!userId) {
      console.error("配對失敗：用戶未認證");
      socket.emit("error", { message: "請先登入" });
      return;
    }

    console.log(`用戶 ${userId} 請求配對`);

    // 檢查玩家是否已在遊戲中
    if (this.isUserInGame(userId)) {
      console.log(`用戶 ${userId} 已在遊戲中`);
      socket.emit("error", { message: "您已在遊戲中" });
      return;
    }

    // 檢查是否已在等待列表中
    if (this.isUserWaiting(userId)) {
      console.log(`用戶 ${userId} 已在等待列表中`);
      return;
    }

    // 尋找可用的對手
    const opponent = this.findAvailableOpponent(userId);

    if (opponent) {
      this.createMatch(socket, userId, opponent);
    } else {
      this.addToWaitingList(socket, userId);
    }
  }

  addToWaitingList(socket, userId) {
    const waitingPlayer = {
      socketId: socket.id,
      userId: userId,
    };
    this.waitingPlayers.add(waitingPlayer);
    socket.emit("waiting");
    console.log(`用戶 ${userId} 已加入等待列表`);
  }

  isUserWaiting(userId) {
    return Array.from(this.waitingPlayers).some(
      (player) => player.userId === userId
    );
  }

  findAvailableOpponent(userId) {
    return Array.from(this.waitingPlayers).find(
      (player) => player.userId !== userId
    );
  }

  createMatch(socket, userId, opponent) {
    const gameId = this.generateGameId();
    console.log(`創建遊戲 ${gameId}: ${userId} vs ${opponent.userId}`);

    // 從等待列表中移除雙方玩家
    this.waitingPlayers.delete(opponent);
    for (const player of this.waitingPlayers) {
      if (player.userId === userId) {
        this.waitingPlayers.delete(player);
        break;
      }
    }

    const opponentSocket = this.io.sockets.sockets.get(opponent.socketId);
    if (!opponentSocket) {
      console.log(`對手 socket ${opponent.socketId} 未找到`);
      // 如果對手斷線，將當前玩家加回等待列表
      this.addToWaitingList(socket, userId);
      return;
    }

    // 檢查雙方是否已在遊戲中
    if (this.isUserInGame(userId) || this.isUserInGame(opponent.userId)) {
      console.log("玩家已在其他遊戲中，取消配對");
      return;
    }

    // 創建遊戲狀態
    const gameState = {
      id: gameId,
      players: {
        red: userId,
        black: opponent.userId,
      },
      currentPlayer: "red",
      board: GameLogic.createEmptyBoard(), // 初始化空棋盤
    };

    // 設置初始棋子位置
    this.setupInitialBoard(gameState.board);

    // 保存遊戲狀態
    this.gameStates.set(gameId, gameState);

    console.log(`遊戲狀態已創建: ${gameId}`);

    // 通知雙方
    socket.emit("matchFound", {
      gameId,
      opponent: { id: opponent.userId, role: "red" },
    });

    opponentSocket.emit("matchFound", {
      gameId,
      opponent: { id: userId, role: "black" },
    });

    // 將玩家加入遊戲房間
    socket.join(gameId);
    opponentSocket.join(gameId);
    console.log(`玩家已加入遊戲房間: ${gameId}`);
  }

  // 設置初始棋盤
  setupInitialBoard(board) {
    // 初始化紅方棋子
    board[9][0] = { type: "車", color: "red" };
    board[9][1] = { type: "馬", color: "red" };
    board[9][2] = { type: "相", color: "red" };
    board[9][3] = { type: "仕", color: "red" };
    board[9][4] = { type: "帥", color: "red" };
    board[9][5] = { type: "仕", color: "red" };
    board[9][6] = { type: "相", color: "red" };
    board[9][7] = { type: "馬", color: "red" };
    board[9][8] = { type: "車", color: "red" };
    board[7][1] = { type: "炮", color: "red" };
    board[7][7] = { type: "炮", color: "red" };
    board[6][0] = { type: "兵", color: "red" };
    board[6][2] = { type: "兵", color: "red" };
    board[6][4] = { type: "兵", color: "red" };
    board[6][6] = { type: "兵", color: "red" };
    board[6][8] = { type: "兵", color: "red" };

    // 初始化黑方棋子
    board[0][0] = { type: "車", color: "black" };
    board[0][1] = { type: "馬", color: "black" };
    board[0][2] = { type: "象", color: "black" };
    board[0][3] = { type: "士", color: "black" };
    board[0][4] = { type: "將", color: "black" };
    board[0][5] = { type: "士", color: "black" };
    board[0][6] = { type: "象", color: "black" };
    board[0][7] = { type: "馬", color: "black" };
    board[0][8] = { type: "車", color: "black" };
    board[2][1] = { type: "砲", color: "black" };
    board[2][7] = { type: "砲", color: "black" };
    board[3][0] = { type: "卒", color: "black" };
    board[3][2] = { type: "卒", color: "black" };
    board[3][4] = { type: "卒", color: "black" };
    board[3][6] = { type: "卒", color: "black" };
    board[3][8] = { type: "卒", color: "black" };
  }

  handleMove(socket, data) {
    const { gameId, from, to } = data;
    const gameState = this.gameStates.get(gameId);

    // 檢查遊戲是否存在
    if (!gameState) {
      console.error(`遊戲 ${gameId} 不存在`);
      return;
    }

    // 檢查是否是當前玩家的回合
    const isRedPlayer = gameState.players.red === socket.userId;
    const isBlackPlayer = gameState.players.black === socket.userId;
    const isCurrentPlayer =
      (gameState.currentPlayer === "red" && isRedPlayer) ||
      (gameState.currentPlayer === "black" && isBlackPlayer);

    if (!isCurrentPlayer) {
      console.log("不是當前玩家的回合");
      socket.emit("moveRejected", { message: "不是你的回合" });
      return;
    }

    // 檢查移動是否合法
    if (!GameLogic.isValidMove(gameState.board, from, to)) {
      socket.emit("moveRejected", { message: "非法移動" });
      return;
    }

    // 執行移動
    const movingPiece = gameState.board[from.row][from.col];
    const targetPiece = gameState.board[to.row][to.col];
    gameState.board[to.row][to.col] = movingPiece;
    gameState.board[from.row][from.col] = null;

    // 檢查是否將軍或將死
    const isCheck = GameLogic.isKingInCheck(gameState.board, {
      row: to.row,
      col: to.col,
      piece: movingPiece,
    });

    const isCheckmate =
      isCheck &&
      GameLogic.isCheckmate(gameState.board, {
        row: to.row,
        col: to.col,
        piece: movingPiece,
      });

    // 廣播移動消息
    this.io.to(gameId).emit("moveMade", {
      from,
      to,
      piece: movingPiece,
      targetPiece,
      isCheck,
      isCheckmate,
      currentPlayer: isCheckmate
        ? null
        : gameState.currentPlayer === "red"
        ? "black"
        : "red",
      effects: {
        capture: !!targetPiece,
        check: isCheck && !isCheckmate,
        checkmate: isCheckmate,
      },
      winner: isCheckmate ? movingPiece.color : null,
    });

    if (isCheckmate) {
      // 如果是將死，延遲發送 gameOver 事件
      setTimeout(() => {
        this.handleGameOver(gameId, movingPiece.color);
      }, 2000); // 延遲 2 秒
    } else {
      // 只有在沒有將死時才切換玩家
      gameState.currentPlayer =
        gameState.currentPlayer === "red" ? "black" : "red";
    }
  }

  async handleSurrender(socket, data) {
    console.log("收到投降請求:", data);
    const { gameId } = data;

    // 從 gameStates 獲取遊戲狀態
    const gameState = this.gameStates.get(gameId);
    if (!gameState) {
      console.log("找不到遊戲狀態:", gameId);
      return;
    }

    // 確定投降方和獲勝方
    const surrenderingPlayer = socket.userId;
    const winner =
      gameState.players.red === surrenderingPlayer
        ? gameState.players.black
        : gameState.players.red;

    console.log("投降方:", surrenderingPlayer);
    console.log("獲勝方:", winner);

    // 發送遊戲結束事件
    this.io.to(gameId).emit("gameover", {
      winner: winner,
      reason: "surrender",
    });

    // 更新遊戲統計
    try {
      // 更新勝者戰績
      await this.updateUserStats(winner, true);

      // 更新敗者戰績
      await this.updateUserStats(surrenderingPlayer, false);

      // 通知前端更新戰績顯示
      this.io.to(gameId).emit("statsUpdated");
    } catch (error) {
      console.error("更新戰績失敗:", error);
    }
  }

  handleDisconnect(socket) {
    const userId = this.onlineUsers.get(socket.id);
    if (userId) {
      this.cleanupUser(socket, userId);
    }
  }

  cleanupUser(socket, userId) {
    this.onlineUsers.delete(socket.id);
    this.removeFromWaitingList(socket.id);
    this.cleanupGames(userId);
    this.io.emit("userOffline", { userId });
  }

  removeFromWaitingList(socketId) {
    for (let player of this.waitingPlayers) {
      if (player.socketId === socketId) {
        this.waitingPlayers.delete(player);
        break;
      }
    }
  }

  cleanupGames(userId) {
    for (const [gameId, gameState] of this.gameStates) {
      // 檢查玩家是否在遊戲中
      if (
        gameState.players.red === userId ||
        gameState.players.black === userId
      ) {
        // 通知其他玩家遊戲結束
        this.io.to(gameId).emit("gameOver", {
          reason: "對手斷開連接",
        });

        // 刪除遊戲狀態
        this.gameStates.delete(gameId);
        console.log(`遊戲 ${gameId} 已清理`);
      }
    }
  }

  handleCancelMatch(socket) {
    const userId = socket.userId;
    if (!userId) return;

    this.removeFromWaitingList(socket.id);
  }

  async updateGameStats(gameId, winnerId) {
    try {
      const gameState = this.gameStates.get(gameId);
      if (!gameState) return;

      // 確保 winnerId 是數字類型
      const winnerIdNum = parseInt(winnerId, 10);
      if (isNaN(winnerIdNum)) {
        console.error("Invalid winnerId:", winnerId);
        return;
      }

      // 創建遊戲記錄
      await Game.create({
        gameId: gameId,
        winnerId: winnerIdNum, // 使用轉換後的數字
        endReason: "normal",
        moves: gameState.moves || [], // 確保 moves 是陣列
      });

      // 更新玩家積分
      await this.updatePlayerRatings(gameState, winnerIdNum);
    } catch (error) {
      console.error("Error updating game stats:", error);
    } finally {
      // 清理遊戲狀態
      this.gameStates.delete(gameId);
    }
  }

  async updatePlayerRatings(gameState, winnerId) {
    try {
      const winner = await User.findById(winnerId);
      if (!winner) {
        console.error("Winner not found:", winnerId);
        return;
      }

      // 找到失敗方的 ID
      const loserId = Object.values(gameState.players).find(
        (id) => id !== winnerId
      );
      if (!loserId) {
        console.error("Loser not found in game state");
        return;
      }

      const loser = await User.findById(loserId);
      if (!loser) {
        console.error("Loser not found:", loserId);
        return;
      }

      const ratingChange = this.calculateRatingChange(
        winner.rating,
        loser.rating
      );

      // 更新積分
      await User.updateRating(winnerId, winner.rating + ratingChange);
      await User.updateRating(loserId, loser.rating - ratingChange);
    } catch (error) {
      console.error("Error updating player ratings:", error);
    }
  }

  calculateRatingChange(winnerRating, loserRating) {
    const K = 32;
    const expectedScore =
      1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    return Math.round(K * (1 - expectedScore));
  }

  generateGameId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // 處理遊戲結束
  async handleGameOver(gameId, winner) {
    const gameState = this.gameStates.get(gameId);
    if (!gameState) return;

    const winnerId = gameState.players[winner];
    const loserId = gameState.players[winner === "red" ? "black" : "red"];

    // 廣播遊戲結束消息
    this.io.to(gameId).emit("gameOver", {
      reason: "checkmate",
      winner: winner,
      winnerId: winnerId,
    });

    try {
      // 更新勝者戰績
      await this.updateUserStats(winnerId, true);

      // 更新敗者戰績
      await this.updateUserStats(loserId, false);

      // 通知前端更新戰績顯示
      this.io.to(gameId).emit("statsUpdated");
    } catch (error) {
      console.error("更新戰績失敗:", error);
    }

    // 更新遊戲統計
    await this.updateGameStats(gameId, winnerId);
  }

  async updateUserStats(userId, isWinner) {
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
      } else {
        if (isWinner) {
          await db.query(
            "UPDATE user_stats SET wins = wins + 1, rating = rating + 25 WHERE user_id = $1 RETURNING wins, losses, rating",
            [userId]
          );
        } else {
          await db.query(
            "UPDATE user_stats SET losses = losses + 1, rating = GREATEST(rating - 25, 0) WHERE user_id = $1 RETURNING wins, losses, rating",
            [userId]
          );
        }
      }
    } catch (error) {
      console.error("更新用戶戰績失敗:", error);
      throw error;
    }
  }
}

module.exports = GameEventHandler;
