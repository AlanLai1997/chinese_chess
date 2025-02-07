const GameLogic = require("../utils/gameLogic");

const ROWS = 10;
const COLS = 9;

let gameState = {
  board: [],
  currentPlayer: "red",
};

// 初始化遊戲狀態
function initGameState() {
  const board = GameLogic.createEmptyBoard();

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

  return {
    board,
    currentPlayer: "red",
    moves: [],
    status: "active",
  };
}

// API handlers
exports.getGameState = (req, res) => {
  res.json({
    board: gameState.board,
    currentPlayer: gameState.currentPlayer,
  });
};

exports.resetGame = (req, res) => {
  initGameState();
  res.json({
    status: "OK",
    message: "Game reset.",
    board: gameState.board,
    currentPlayer: gameState.currentPlayer,
  });
};

exports.makeMove = (req, res) => {
  const { fromRow, fromCol, toRow, toCol } = req.body;

  // 1. 基本參數驗證
  if (
    fromRow == null ||
    fromCol == null ||
    toRow == null ||
    toCol == null ||
    fromRow < 0 ||
    fromRow >= 10 ||
    fromCol < 0 ||
    fromCol >= 9 ||
    toRow < 0 ||
    toRow >= 10 ||
    toCol < 0 ||
    toCol >= 9
  ) {
    return res.status(400).json({
      status: "ERROR",
      message: "Invalid move parameters or out of bounds.",
    });
  }

  // 2. 獲取移動的棋子
  const piece = gameState.board[fromRow][fromCol];
  if (!piece) {
    return res.status(400).json({
      status: "ERROR",
      message: "No piece at the source position.",
    });
  }

  // 3. 確認是當前玩家的回合
  if (piece.color !== gameState.currentPlayer) {
    return res.status(400).json({
      status: "ERROR",
      message: `It's ${gameState.currentPlayer}'s turn.`,
    });
  }

  // 4. 檢查目標位置
  const targetPiece = gameState.board[toRow][toCol];
  if (targetPiece && targetPiece.color === piece.color) {
    return res.status(400).json({
      status: "ERROR",
      message: "Cannot capture your own piece.",
    });
  }

  // 5. 檢查移動是否合法
  if (
    !GameLogic.isValidMove(
      piece,
      fromRow,
      fromCol,
      toRow,
      toCol,
      gameState.board
    )
  ) {
    return res.status(400).json({
      status: "ERROR",
      message: "Invalid move.",
    });
  }

  // 6. 如果當前被將軍，檢查這步棋是否能解將
  if (GameLogic.isInCheck(gameState.currentPlayer, gameState.board)) {
    const tempBoard = GameLogic.copyBoard(gameState.board);
    tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
    tempBoard[fromRow][fromCol] = null;

    if (GameLogic.isInCheck(gameState.currentPlayer, tempBoard)) {
      return res.status(400).json({
        status: "ERROR",
        message: "必須化解將軍！",
      });
    }
  }

  // 7. 移動棋子
  const tempBoard = GameLogic.copyBoard(gameState.board);
  tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
  tempBoard[fromRow][fromCol] = null;

  // 8. 檢查王見王
  if (GameLogic.isKingFacingKing(tempBoard)) {
    return res.status(400).json({
      status: "ERROR",
      message: "King facing king (將帥見面)!",
    });
  }

  // 9. 更新棋盤
  gameState.board = tempBoard;

  // 10. 切換回合
  const previousPlayer = gameState.currentPlayer;
  gameState.currentPlayer = gameState.currentPlayer === "red" ? "black" : "red";

  // 11. 檢查是否將軍或絕殺
  if (GameLogic.isInCheck(gameState.currentPlayer, gameState.board)) {
    if (
      !GameLogic.hasValidMovesToPreventCheck(
        gameState.currentPlayer,
        gameState.board
      )
    ) {
      // 絕殺，遊戲結束
      return res.json({
        status: "OK",
        message: "checkmate",
        board: gameState.board,
        currentPlayer: gameState.currentPlayer,
        gameOver: true,
        winner: previousPlayer,
      });
    }
    // 普通將軍
    return res.json({
      status: "OK",
      message: "將軍!!!",
      board: gameState.board,
      currentPlayer: gameState.currentPlayer,
    });
  }

  // 12. 正常移動
  return res.json({
    status: "OK",
    message: "Move successful",
    board: gameState.board,
    currentPlayer: gameState.currentPlayer,
  });
};
