// models/GameState.js
const gameLogic = require("../utils/gameLogic");

class GameState {
  constructor(gameId) {
    this.id = gameId;
    this.board = gameLogic.createEmptyBoard();
    this.currentPlayer = "red";
    this.players = new Map();
    this.moves = [];
    this.startTime = Date.now();
  }

  initializeBoard() {
    gameLogic.placeInitialPieces(this.board);
  }

  isValidMove(from, to) {
    const piece = this.board[from.row][from.col];
    if (!piece || piece.color !== this.currentPlayer) return false;

    return gameLogic.isValidMove(
      piece,
      from.row,
      from.col,
      to.row,
      to.col,
      this.board
    );
  }

  makeMove(from, to) {
    const piece = this.board[from.row][from.col];
    const capturedPiece = this.board[to.row][to.col];

    // 記錄移動
    this.moves.push({
      from,
      to,
      piece: { ...piece },
      captured: capturedPiece ? { ...capturedPiece } : null,
      timestamp: Date.now(),
    });

    // 執行移動
    this.board[to.row][to.col] = piece;
    this.board[from.row][from.col] = null;

    // 切換玩家
    this.currentPlayer = this.currentPlayer === "red" ? "black" : "red";
  }

  isCheckmate() {
    return (
      gameLogic.isInCheck(this.currentPlayer, this.board) &&
      !gameLogic.hasValidMovesToPreventCheck(this.currentPlayer, this.board)
    );
  }

  isCheck() {
    return gameLogic.isInCheck(this.currentPlayer, this.board);
  }

  getPlayerRole(userId) {
    return this.players.get(userId)?.role;
  }

  isPlayerTurn(userId) {
    const role = this.getPlayerRole(userId);
    return (
      (role === "red" && this.currentPlayer === "red") ||
      (role === "black" && this.currentPlayer === "black")
    );
  }

  getGameDuration() {
    return Date.now() - this.startTime;
  }

  toJSON() {
    return {
      id: this.id,
      board: this.board,
      currentPlayer: this.currentPlayer,
      players: Array.from(this.players.entries()),
      moves: this.moves,
      startTime: this.startTime,
    };
  }
}

module.exports = GameState;
