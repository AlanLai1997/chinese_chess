const GameLogic = require("../src/utils/gameLogic");

describe("GameLogic", () => {
  describe("基本移動規則", () => {
    let board;

    beforeEach(() => {
      // 每個測試前重置棋盤
      board = GameLogic.createEmptyBoard();
      // 設置基本棋子
      board[0][0] = { type: "車", color: "black" };
      board[0][1] = { type: "馬", color: "black" };
      board[9][0] = { type: "車", color: "red" };
    });

    test("車應該可以直線移動", () => {
      expect(
        GameLogic.isValidMove(board, { row: 0, col: 0 }, { row: 5, col: 0 })
      ).toBe(true);
    });

    test("車不能斜線移動", () => {
      expect(
        GameLogic.isValidMove(board, { row: 0, col: 0 }, { row: 1, col: 1 })
      ).toBe(false);
    });

    test("馬應該可以走日字", () => {
      expect(
        GameLogic.isValidMove(board, { row: 0, col: 1 }, { row: 2, col: 2 })
      ).toBe(true);
    });

    test("馬不能直線移動", () => {
      expect(
        GameLogic.isValidMove(board, { row: 0, col: 1 }, { row: 0, col: 3 })
      ).toBe(false);
    });
  });

  describe("將軍和將死檢查", () => {
    let board;

    beforeEach(() => {
      board = GameLogic.createEmptyBoard();
      board[0][4] = { type: "將", color: "black" };
      board[2][4] = { type: "車", color: "red" };
    });

    test("應該檢測到將軍狀態", () => {
      expect(GameLogic.isInCheck("black", board)).toBe(true);
    });

    test("應該檢測到將死狀態", () => {
      board[0][3] = { type: "車", color: "red" };
      expect(
        GameLogic.isCheckmate(board, {
          row: 0,
          col: 3,
          piece: { type: "車", color: "red" },
        })
      ).toBe(true);
    });

    test("非將軍狀態應返回 false", () => {
      const newBoard = GameLogic.createEmptyBoard();
      newBoard[0][4] = { type: "將", color: "black" };
      expect(GameLogic.isInCheck("black", newBoard)).toBe(false);
    });
  });

  describe("特殊規則測試", () => {
    test("過河兵應該可以橫向移動", () => {
      const board = GameLogic.createEmptyBoard();
      board[4][0] = { type: "兵", color: "red" };

      expect(
        GameLogic.isValidMove(board, { row: 4, col: 0 }, { row: 4, col: 1 })
      ).toBe(true);
    });

    test("未過河兵不能橫向移動", () => {
      const board = GameLogic.createEmptyBoard();
      board[6][0] = { type: "兵", color: "red" };

      expect(
        GameLogic.isValidMove(board, { row: 6, col: 0 }, { row: 6, col: 1 })
      ).toBe(false);
    });

    test("炮應該可以隔子吃子", () => {
      const board = GameLogic.createEmptyBoard();
      board[0][0] = { type: "炮", color: "red" };
      board[0][2] = { type: "馬", color: "red" }; // 炮架
      board[0][4] = { type: "將", color: "black" }; // 目標

      expect(
        GameLogic.isValidMove(board, { row: 0, col: 0 }, { row: 0, col: 4 })
      ).toBe(true);
    });
  });

  describe("錯誤處理", () => {
    test("移動不存在的棋子應該返回 false", () => {
      const board = GameLogic.createEmptyBoard();
      expect(
        GameLogic.isValidMove(board, { row: 0, col: 0 }, { row: 1, col: 0 })
      ).toBe(false);
    });

    test("移動到棋盤外應該返回 false", () => {
      const board = GameLogic.createEmptyBoard();
      board[0][0] = { type: "車", color: "black" };
      expect(
        GameLogic.isValidMove(board, { row: 0, col: 0 }, { row: -1, col: 0 })
      ).toBe(false);
    });

    test("移動到己方棋子位置應該返回 false", () => {
      const board = GameLogic.createEmptyBoard();
      board[0][0] = { type: "車", color: "black" };
      board[0][1] = { type: "馬", color: "black" };
      expect(
        GameLogic.isValidMove(board, { row: 0, col: 0 }, { row: 0, col: 1 })
      ).toBe(false);
    });
  });
});
