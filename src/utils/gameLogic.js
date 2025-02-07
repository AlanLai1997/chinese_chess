const ROWS = 10;
const COLS = 9;

class GameLogic {
  // 檢查移動是否合法
  static isValidMove(board, from, to) {
    const piece = board[from.row][from.col];
    if (!piece) return false;

    // 檢查基本移動規則
    if (!this.isValidBasicMove(board, from, to)) {
      return false;
    }

    // 模擬移動
    const tempBoard = this.cloneBoard(board);
    tempBoard[to.row][to.col] = tempBoard[from.row][from.col];
    tempBoard[from.row][from.col] = null;

    // 檢查移動後是否會導致自己被將軍
    return !this.isInCheck(piece.color, tempBoard);
  }

  // 新增一個只檢查基本移動規則的方法
  static isValidBasicMove(board, from, to) {
    const piece = board[from.row][from.col];
    if (!piece) return false;

    // 檢查是否在棋盤範圍內
    if (!this.isInBoard(to.row, to.col)) return false;

    // 檢查目標位置是否是己方棋子
    const targetPiece = board[to.row][to.col];
    if (targetPiece && targetPiece.color === piece.color) return false;

    // 檢查具體棋子的移動規則
    switch (piece.type) {
      case "將":
      case "帥":
        return this.isValidKingMove(board, from, to);
      case "士":
      case "仕":
        return this.isValidAdvisorMove(board, from, to);
      case "象":
      case "相":
        return this.isValidElephantMove(board, from, to);
      case "馬":
        return this.isValidHorseMove(board, from, to);
      case "車":
        return this.isValidRookMove(board, from, to);
      case "砲":
      case "炮":
        return this.isValidCannonMove(board, from, to);
      case "卒":
      case "兵":
        return this.isValidPawnMove(board, from, to, piece.color);
      default:
        return false;
    }
  }

  // 檢查是否將軍
  static isKingInCheck(board, lastMove) {
    const piece = lastMove.piece || board[lastMove.row][lastMove.col];
    if (!piece) return false;

    const color = piece.color;
    let kingRow = -1,
      kingCol = -1;

    // 尋找對方的將/帥
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = board[r][c];
        if (!p) continue;
        if (p.color !== color && (p.type === "帥" || p.type === "將")) {
          kingRow = r;
          kingCol = c;
          break;
        }
      }
      if (kingRow !== -1) break;
    }

    if (kingRow === -1) return false;

    // 檢查是否有任何己方棋子可以吃到對方的將/帥
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const attackingPiece = board[r][c];
        if (!attackingPiece || attackingPiece.color !== color) continue;

        // 使用基本移動規則檢查
        if (
          this.isValidBasicMove(
            board,
            { row: r, col: c },
            { row: kingRow, col: kingCol }
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  // 檢查是否將死
  static isCheckmate(board, lastMove) {
    const piece = lastMove.piece || board[lastMove.row][lastMove.col];
    if (!piece) return false;

    const opponentColor = piece.color === "red" ? "black" : "red";

    // 先檢查是否被將軍
    if (!this.isInCheck(opponentColor, board)) {
      return false;
    }

    // 尋找對方的將/帥位置
    let kingRow = -1,
      kingCol = -1;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = board[r][c];
        if (
          p &&
          p.color === opponentColor &&
          (p.type === "將" || p.type === "帥")
        ) {
          kingRow = r;
          kingCol = c;
          break;
        }
      }
      if (kingRow !== -1) break;
    }

    // 檢查所有可能的解救方式：
    // 1. 將/帥自己移動
    // 2. 其他棋子移動阻擋或吃掉攻擊棋子
    for (let fromRow = 0; fromRow < ROWS; fromRow++) {
      for (let fromCol = 0; fromCol < COLS; fromCol++) {
        const movingPiece = board[fromRow][fromCol];
        if (!movingPiece || movingPiece.color !== opponentColor) continue;

        for (let toRow = 0; toRow < ROWS; toRow++) {
          for (let toCol = 0; toCol < COLS; toCol++) {
            // 跳過原地不動
            if (fromRow === toRow && fromCol === toCol) continue;

            // 檢查移動是否合法
            if (
              this.isValidBasicMove(
                board,
                { row: fromRow, col: fromCol },
                { row: toRow, col: toCol }
              )
            ) {
              // 模擬移動
              const tempBoard = this.cloneBoard(board);
              tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
              tempBoard[fromRow][fromCol] = null;

              // 檢查移動後是否還在將軍狀態
              if (!this.isInCheck(opponentColor, tempBoard)) {
                console.log(
                  `找到解救方式：${movingPiece.type} 從 (${fromRow},${fromCol}) 到 (${toRow},${toCol})`
                );
                return false; // 找到一個可以解除將軍的移動
              }
            }
          }
        }
      }
    }

    // 找不到任何解救方式，確實是將死
    console.log(`確認將死！${opponentColor}方無法解除將軍`);
    return true;
  }

  // 輔助方法：檢查是否被將軍（用於將死檢查）
  static isInCheck(color, board) {
    // 尋找己方的將/帥
    let kingRow = -1,
      kingCol = -1;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = board[r][c];
        if (!p) continue;
        if (p.color === color && (p.type === "帥" || p.type === "將")) {
          kingRow = r;
          kingCol = c;
          break;
        }
      }
      if (kingRow !== -1) break;
    }

    if (kingRow === -1) return false; // 找不到將/帥

    // 檢查是否有任何敵方棋子可以吃到己方的將/帥
    const opponentColor = color === "red" ? "black" : "red";
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const piece = board[r][c];
        if (!piece || piece.color !== opponentColor) continue;

        if (
          this.isValidBasicMove(
            board,
            { row: r, col: c },
            { row: kingRow, col: kingCol }
          )
        ) {
          console.log(
            `將軍！${piece.type} at (${r},${c}) 威脅到 ${color}方將/帥`
          );
          return true;
        }
      }
    }

    return false;
  }

  // 輔助方法
  static isInBoard(row, col) {
    return row >= 0 && row < ROWS && col >= 0 && col < COLS;
  }

  static findKing(board, color) {
    const kingType = color === "red" ? "帥" : "將";
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const piece = board[r][c];
        if (piece && piece.color === color && piece.type === kingType) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  static cloneBoard(board) {
    return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  }

  // 將/帥的移動規則
  static isValidKingMove(board, from, to) {
    const piece = board[from.row][from.col];
    const isRed = piece.color === "red";

    // 檢查是否在九宮格內
    if (!this.isInPalace(to.row, to.col, isRed)) {
      return false;
    }

    // 只能上下左右移動一格
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);
    if (
      !((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1))
    ) {
      return false;
    }

    // 檢查是否面對面
    const oppositeKing = this.findOppositeKing(board, from);
    if (oppositeKing && to.col === oppositeKing.col) {
      let hasBlockingPiece = false;
      const startRow = Math.min(to.row, oppositeKing.row);
      const endRow = Math.max(to.row, oppositeKing.row);

      for (let r = startRow + 1; r < endRow; r++) {
        if (board[r][to.col]) {
          hasBlockingPiece = true;
          break;
        }
      }

      if (!hasBlockingPiece) {
        return false; // 不允許將帥對面
      }
    }

    return true;
  }

  // 士/仕的移動規則
  static isValidAdvisorMove(board, from, to) {
    const piece = board[from.row][from.col];
    const isRed = piece.color === "red";

    // 檢查是否在九宮格內
    if (!this.isInPalace(to.row, to.col, isRed)) {
      return false;
    }

    // 只能斜著走一格
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);
    return rowDiff === 1 && colDiff === 1;
  }

  // 象/相的移動規則
  static isValidElephantMove(board, from, to) {
    const piece = board[from.row][from.col];
    const isRed = piece.color === "red";

    // 不能過河
    if (isRed && to.row < 5) return false;
    if (!isRed && to.row > 4) return false;

    // 必須是斜著走兩格
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);
    if (rowDiff !== 2 || colDiff !== 2) return false;

    // 檢查象眼是否被擋住
    const eyeRow = (from.row + to.row) / 2;
    const eyeCol = (from.col + to.col) / 2;
    if (board[eyeRow][eyeCol]) return false;

    return true;
  }

  // 馬的移動規則
  static isValidHorseMove(board, from, to) {
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    // 必須是日字形走法
    if (
      !((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2))
    ) {
      return false;
    }

    // 檢查馬腳是否被擋住
    let legRow = from.row;
    let legCol = from.col;

    if (rowDiff === 2) {
      legRow = from.row + (to.row > from.row ? 1 : -1);
      legCol = from.col;
    } else {
      legRow = from.row;
      legCol = from.col + (to.col > from.col ? 1 : -1);
    }

    return !board[legRow][legCol];
  }

  // 車的移動規則
  static isValidRookMove(board, from, to) {
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    // 必須直著走或橫著走
    if (rowDiff !== 0 && colDiff !== 0) return false;

    // 檢查路徑上是否有其他棋子
    if (rowDiff === 0) {
      const minCol = Math.min(from.col, to.col);
      const maxCol = Math.max(from.col, to.col);
      for (let c = minCol + 1; c < maxCol; c++) {
        if (board[from.row][c]) return false;
      }
    } else {
      const minRow = Math.min(from.row, to.row);
      const maxRow = Math.max(from.row, to.row);
      for (let r = minRow + 1; r < maxRow; r++) {
        if (board[r][from.col]) return false;
      }
    }

    return true;
  }

  // 炮的移動規則
  static isValidCannonMove(board, from, to) {
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    // 必須直著走或橫著走
    if (rowDiff !== 0 && colDiff !== 0) return false;

    const isCapture = !!board[to.row][to.col]; // 是否吃子
    let obstacles = 0;

    // 計算路徑上的棋子數量
    if (rowDiff === 0) {
      // 橫向移動
      const start = Math.min(from.col, to.col) + 1;
      const end = Math.max(from.col, to.col);
      for (let c = start; c < end; c++) {
        if (board[from.row][c]) obstacles++;
      }
    } else {
      // 縱向移動
      const start = Math.min(from.row, to.row) + 1;
      const end = Math.max(from.row, to.row);
      for (let r = start; r < end; r++) {
        if (board[r][from.col]) obstacles++;
      }
    }

    // 炮的移動規則：
    // 1. 如果是吃子，必須有且只有一個炮架
    // 2. 如果是移動，中間不能有任何棋子
    return isCapture ? obstacles === 1 : obstacles === 0;
  }

  // 兵/卒的移動規則
  static isValidPawnMove(board, from, to, color) {
    const rowDiff = to.row - from.row;
    const colDiff = Math.abs(to.col - from.col);

    // 判定是否過河
    const isRedCrossed = from.row <= 4; // 紅兵 row <= 4 => 已過河
    const isBlackCrossed = from.row >= 5; // 黑卒 row >= 5 => 已過河

    if (color === "red") {
      // =============== 紅兵 ===============
      if (!isRedCrossed) {
        // 未過河 ⇒ 只能往上走一格(rowDiff = -1)且 colDiff=0
        if (rowDiff !== -1 || colDiff !== 0) return false;
      } else {
        // 已過河 ⇒ 可「往上 1」或「左右 1」
        const isUpOne = rowDiff === -1 && colDiff === 0;
        const isSideOne = rowDiff === 0 && colDiff === 1;
        if (!isUpOne && !isSideOne) return false;
      }
    } else {
      // =============== 黑卒 ===============
      if (!isBlackCrossed) {
        // 未過河 ⇒ 只能往下走一格(rowDiff = +1)且 colDiff=0
        if (rowDiff !== 1 || colDiff !== 0) return false;
      } else {
        // 已過河 ⇒ 可「往下 1」或「左右 1」
        const isDownOne = rowDiff === 1 && colDiff === 0;
        const isSideOne = rowDiff === 0 && colDiff === 1;
        if (!isDownOne && !isSideOne) return false;
      }
    }

    return true;
  }

  // 檢查是否在九宮格內
  static isInPalace(row, col, isRed) {
    const validCols = [3, 4, 5];
    if (isRed) {
      return row >= 7 && row <= 9 && validCols.includes(col);
    } else {
      return row >= 0 && row <= 2 && validCols.includes(col);
    }
  }

  // 尋找對方的將/帥
  static findOppositeKing(board, currentKingPos) {
    const currentPiece = board[currentKingPos.row][currentKingPos.col];
    const targetType = currentPiece.color === "red" ? "將" : "帥";

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const piece = board[r][c];
        if (piece && piece.type === targetType) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  // 創建空棋盤
  static createEmptyBoard() {
    return Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(null));
  }

  static isKingFacingKing(board) {
    // Implementation of isKingFacingKing method
  }
}

module.exports = GameLogic;
