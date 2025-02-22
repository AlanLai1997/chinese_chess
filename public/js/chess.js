const BOARD_WIDTH = 540; // The width of #chessboard in px
const BOARD_HEIGHT = 600; // The height of #chessboard in px

// Given 10 rows × 9 columns intersections for Chinese chess:
const ROWS = 10;
const COLS = 9;

// Compute the distance between each intersection
const cellWidth = 60; // e.g. ~60 if 540/(9-1)
const cellHeight = 60; // e.g. ~66.7 if 600/(10-1)
// const cellWidth = BOARD_WIDTH / (COLS - 1); // e.g. ~60 if 540/(9-1)
// const cellHeight = BOARD_HEIGHT / (ROWS - 1);
const offsetX = 26;
const offsetY = 23;
// ------------------------------------------------------
// Global references
// const boardElement = document.getElementById("chessboard");
// const resetBtn = document.getElementById("resetBtn");
let boardElement = null;
let socket;
let currentGameId;
let opponentId;
let playerRole;
let waitingTimer;
let waitingTime = 0;
// 音效物件
const moveSound = new Audio("/sounds/move.mp3");
const captureSound = new Audio("/sounds/capture.mp3");
const checkSound = new Audio("/sounds/check.mp3");
const checkmateSound = new Audio("/sounds/checkmate.mp3");

// 新增函数，将认证检查逻辑单独封装
async function checkAuth() {
  const response = await fetch("/api/auth/check");
  const data = await response.json();
  if (data.isAuthenticated && data.user) {
    console.log("用戶已登入:", data.user);
    // 更新用戶界面
    const usernameSpan = document.getElementById("username");
    if (usernameSpan) {
      usernameSpan.textContent = data.user.username;
    }
    enableGameControls();
    return data.user;
  } else {
    throw new Error("未登入或會話已過期");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 調用封裝的認證函數，確保用戶已登入並更新界面
    const user = await checkAuth();

    // 創建 socket 連接及後續相關操作
    socket = io();
    setupSocketListeners();
    socket.emit("auth", user.id);

    // 初始化 UI 元素
    initializeUI();

    // 在初始化時添加樣式
    addGameResultStyles();

    // 載入用戶戰績
    await loadUserStats();
  } catch (error) {
    console.error("初始化錯誤:", error);
    window.location.href = "/login";
  }
});

function setupSocketListeners() {
  socket.on("connect", () => {
    console.log("Connected to server");
  });

  socket.on("auth_success", (data) => {
    console.log("認證成功:", data);
    socket.userId = data.userId; // 保存 userId 到 socket 對象

    // 如果有未完成的遊戲信息，嘗試重連
    if (data.gameInfo) {
      console.log("檢測到未完成的遊戲，嘗試重連...");
      socket.emit("reconnect");
    }
    enableGameControls();
  });
  socket.on("waiting", () => {
    showWaitingScreen();
    startWaitingTimer();
    // 啟用取消配對按鈕
    const cancelMatchBtn = document.getElementById("cancelMatchBtn");
    if (cancelMatchBtn) {
      cancelMatchBtn.disabled = false;
    }
  });
  socket.on("matchFound", (data) => {
    console.log("匹配成功");

    handleMatchFound(data);
  });

  socket.on("duplicate_login", () => {
    alert("您的帳號已在其他地方登入");
    window.location.href = "/login";
  });

  socket.on("disconnect", () => {
    console.log("斷開連接");
    stopWaitingTimer();
    disableGameControls();
  });

  socket.on("moveMade", (data) => {
    const {
      from,
      to,
      piece,
      targetPiece,
      isCheck,
      isCheckmate,
      currentPlayer,
      effects,
      winner,
    } = data;

    // 更新棋盤狀態
    currentBoard[to.row][to.col] = piece;
    currentBoard[from.row][from.col] = null;

    // 更新當前玩家
    gameState.currentPlayer = currentPlayer;

    // 重新渲染棋盤
    renderBoard();

    // 處理音效和動畫效果
    if (effects) {
      if (isCheckmate) {
        playSound("checkmate");
        showCheckmateAnimation();
        disableBoard();

        setTimeout(() => {
          showGameResultDialog(`${winner}方獲勝！`);
        }, 1500);
      } else {
        // 不是將死的情況下，處理其他音效
        if (effects.capture) {
          playSound("capture");
        } else {
          playSound("move");
        }

        // 如果是將軍（且不是將死），播放將軍音效和動畫
        if (isCheck) {
          playSound("check");
          showCheckAnimation();
        }
      }
    }

    // 更新回合指示器
    updateTurnIndicator();
  });

  socket.on("gameover", (data) => {
    console.log("遊戲結束:", data);
    console.log("當前用戶ID:", socket.userId);

    if (data.reason === "checkmate") {
      // 將死結束的情況已在 moveMade 事件中處理
      return;
    }

    // 根據不同結束原因顯示不同消息
    let message;
    if (data.reason === "surrender") {
      message = `遊戲結束 - ${
        data.winner === socket.userId ? "對方" : "我方"
      }投降`;
    } else if (data.reason === "disconnect") {
      message = `對手已離開遊戲，${
        data.winnerColor === "red" ? "紅" : "黑"
      }方獲勝`;
    } else {
      message = `遊戲結束，${data.winner}方獲勝`;
    }

    showGameResultDialog(message);
  });

  socket.on("statsUpdated", async () => {
    try {
      // 重新載入用戶戰績
      await loadUserStats();
    } catch (error) {
      console.error("更新戰績顯示失敗:", error);
    }
  });

  // 監聽對手狀態變化
  socket.on("opponent_status", (data) => {
    alert(data.message);
  });

  // 監聽遊戲狀態同步
  socket.on("game_state_sync", (data) => {
    console.log("收到遊戲狀態同步:", data);
    currentBoard = data.gameState;
    gameState.currentPlayer = data.currentTurn;
    playerRole = data.role;
    currentGameId = data.gameId;

    // 更新遊戲界面
    const statusText = document.getElementById("statusText");
    if (statusText) {
      statusText.textContent = `遊戲進行中！你是${
        playerRole === "red" ? "紅方" : "黑方"
      }`;
    }

    // 啟用投降按鈕
    const surrenderBtn = document.getElementById("surrenderBtn");
    if (surrenderBtn) {
      surrenderBtn.disabled = false;
    }

    // 如果正在顯示等待重連畫面，隱藏它
    hideWaitingScreen();

    renderBoard();
  });

  socket.on("opponent_disconnected", (data) => {
    showWaitingScreen("對手已斷線，等待重連...", false);
  });

  socket.on("opponent_reconnected", (data) => {
    hideWaitingScreen();
    const statusText = document.getElementById("statusText");
    if (statusText) {
      statusText.textContent = "對手已重新連接，遊戲繼續！";
    }
  });
}

function initializeUI() {
  boardElement = document.getElementById("chessboard");
  if (!boardElement) {
    console.error("找不到棋盤元素");
    return;
  }

  // 添加個人資料按鈕點擊事件
  const profileBtn = document.getElementById("profileBtn");
  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      window.location.href = "/profile";
    });
  }

  // 初始化空棋盤
  renderEmptyBoard();

  const findMatchBtn = document.getElementById("findMatchBtn");
  const surrenderBtn = document.getElementById("surrenderBtn");
  const cancelMatchBtn = document.getElementById("cancelMatchBtn");

  if (findMatchBtn) {
    findMatchBtn.addEventListener("click", () => {
      socket.emit("findMatch");
      showWaitingScreen();
    });
  }

  if (cancelMatchBtn) {
    cancelMatchBtn.addEventListener("click", () => {
      socket.emit("cancelMatch");
      hideWaitingScreen();
      stopWaitingTimer();
    });
  }

  // 禁用投降按鈕（直到遊戲開始）
  if (surrenderBtn) {
    surrenderBtn.disabled = true; // 初始時禁用
    surrenderBtn.addEventListener("click", () => {
      if (confirm("確定要投降嗎？")) {
        console.log("投降按鈕被點擊");
        console.log("當前遊戲ID:", currentGameId);
        socket.emit("surrender", { gameId: currentGameId });
      }
    });
  }
}

function showWaitingScreen(message = "等待配對中...", showTimer = true) {
  // 先移除可能存在的等待畫面
  hideWaitingScreen();
  const waitingScreen = document.createElement("div");
  waitingScreen.className = "waiting-screen";
  waitingScreen.innerHTML = `
    <div class="waiting-content">
      <div class="spinner"></div>
      <p class="waiting-text">${message}</p>
      ${showTimer ? '<p class="waiting-timer" id="waitingTimer">00:00</p>' : ""}
      ${
        message.includes("重連")
          ? '<p class="reconnect-timer" id="reconnectTimer">60</p>'
          : ""
      }
      ${
        !message.includes("重連")
          ? '<button onclick="socket.emit(\'cancelMatch\'); hideWaitingScreen();" class="cancel-btn">取消配對</button>'
          : ""
      }
    </div>
  `;
  console.log("創建等待畫面");
  document.body.appendChild(waitingScreen);
  if (showTimer) {
    startWaitingTimer();
  }
  if (message.includes("重連")) {
    startReconnectTimer();
  }
}
function hideWaitingScreen() {
  console.log("隱藏等待畫面");
  const waitingScreen = document.querySelector(".waiting-screen");
  console.log("找到等待畫面元素:", waitingScreen);
  if (waitingScreen) {
    waitingScreen.remove();
    console.log("等待畫面已移除");
  }
  stopWaitingTimer();
  if (window.reconnectTimer) {
    clearInterval(window.reconnectTimer);
    window.reconnectTimer = null;
  }
}

function enableGameControls() {
  const findMatchBtn = document.getElementById("findMatchBtn");
  if (findMatchBtn) {
    findMatchBtn.disabled = false;
  }
}

function disableGameControls() {
  const findMatchBtn = document.getElementById("findMatchBtn");
  if (findMatchBtn) {
    findMatchBtn.disabled = true;
  }
}

let currentBoard = [];
let gameState = {
  currentPlayer: "red", // 初始為紅方
};
// Currently selected piece (if any)
let selectedPiece = null;
// 1) Initialization
// 當對手移動棋子時

function disableBoard() {
  boardElement.classList.add("board-disabled");
}

// 啟用棋盤
function enableBoard() {
  boardElement.classList.remove("board-disabled");
}

// 初始化棋盤
function initializeBoard() {
  if (!boardElement) return;

  // 清空棋盤
  boardElement.innerHTML = "";
  currentBoard = Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(null));

  // 設置初始棋子
  setupInitialPieces();

  // 渲染棋盤
  renderBoard();

  // 根據玩家角色設置棋盤狀態
  if (playerRole === "black" && gameState.currentPlayer === "red") {
    disableBoard();
  } else {
    enableBoard();
  }
}

// 設置初始棋子
function setupInitialPieces() {
  // 紅方（下方）
  currentBoard[9][0] = { type: "車", color: "red" };
  currentBoard[9][1] = { type: "馬", color: "red" };
  currentBoard[9][2] = { type: "相", color: "red" };
  currentBoard[9][3] = { type: "仕", color: "red" };
  currentBoard[9][4] = { type: "帥", color: "red" };
  currentBoard[9][5] = { type: "仕", color: "red" };
  currentBoard[9][6] = { type: "相", color: "red" };
  currentBoard[9][7] = { type: "馬", color: "red" };
  currentBoard[9][8] = { type: "車", color: "red" };
  currentBoard[7][1] = { type: "炮", color: "red" };
  currentBoard[7][7] = { type: "炮", color: "red" };
  currentBoard[6][0] = { type: "兵", color: "red" };
  currentBoard[6][2] = { type: "兵", color: "red" };
  currentBoard[6][4] = { type: "兵", color: "red" };
  currentBoard[6][6] = { type: "兵", color: "red" };
  currentBoard[6][8] = { type: "兵", color: "red" };

  // 黑方（上方）
  currentBoard[0][0] = { type: "車", color: "black" };
  currentBoard[0][1] = { type: "馬", color: "black" };
  currentBoard[0][2] = { type: "象", color: "black" };
  currentBoard[0][3] = { type: "士", color: "black" };
  currentBoard[0][4] = { type: "將", color: "black" };
  currentBoard[0][5] = { type: "士", color: "black" };
  currentBoard[0][6] = { type: "象", color: "black" };
  currentBoard[0][7] = { type: "馬", color: "black" };
  currentBoard[0][8] = { type: "車", color: "black" };
  currentBoard[2][1] = { type: "砲", color: "black" };
  currentBoard[2][7] = { type: "砲", color: "black" };
  currentBoard[3][0] = { type: "卒", color: "black" };
  currentBoard[3][2] = { type: "卒", color: "black" };
  currentBoard[3][4] = { type: "卒", color: "black" };
  currentBoard[3][6] = { type: "卒", color: "black" };
  currentBoard[3][8] = { type: "卒", color: "black" };
}

// 3) Render board: create absolute-positioned "cells" for each intersection.
function renderBoard() {
  if (!boardElement) {
    console.error("棋盤元素未找到");
    return;
  }

  // 清空棋盤
  boardElement.innerHTML = "";

  // 重新渲染所有格子和棋子
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cellDiv = document.createElement("div");
      cellDiv.classList.add("cell");
      cellDiv.dataset.row = r;
      cellDiv.dataset.col = c;

      cellDiv.style.position = "absolute";
      cellDiv.style.width = "40px";
      cellDiv.style.height = "40px";
      cellDiv.style.left = offsetX + c * cellWidth + "px";
      cellDiv.style.top = offsetY + r * cellHeight + "px";
      cellDiv.style.transform = "translate(-50%, -50%)";

      // 添加點擊事件處理
      cellDiv.addEventListener("click", handleCellClick);

      // 如果該位置有棋子，創建棋子元素
      const piece = currentBoard[r][c];
      if (piece) {
        const pieceDiv = document.createElement("div");
        pieceDiv.classList.add("piece", piece.color);
        pieceDiv.innerText = piece.type;
        pieceDiv.dataset.row = r;
        pieceDiv.dataset.col = c;
        cellDiv.appendChild(pieceDiv);
      }

      boardElement.appendChild(cellDiv);
    }
  }

  // 根據當前玩家回合設置棋盤狀態
  if (gameState.currentPlayer !== playerRole) {
    disableBoard();
  } else {
    enableBoard();
  }
}

// 4) Helper to get piece from currentBoard
function getPieceAt(row, col) {
  if (!currentBoard[row] || !currentBoard[row][col]) {
    return null;
  }
  return currentBoard[row][col];
}

function selectPiece(row, col, pieceElement) {
  deselectPiece(); // clear old selection
  const piece = getPieceAt(row, col);
  selectedPiece = { row, col, piece, element: pieceElement };
  pieceElement.classList.add("selected");
}

// 7) Deselect
function deselectPiece() {
  if (selectedPiece && selectedPiece.element) {
    selectedPiece.element.classList.remove("selected");
  }
  selectedPiece = null;
}

function showCheckAnimation() {
  const board = document.querySelector("#chessboard");
  board.classList.add("check-flash");
  setTimeout(() => {
    board.classList.remove("check-flash");
  }, 1000);
}

function updateTurnIndicator() {
  const indicator = document.querySelector(".turn-indicator");
  if (indicator) {
    // 移除之前的類
    indicator.classList.remove("red-turn", "black-turn");
    // 添加當前回合的類
    indicator.classList.add(
      gameState.currentPlayer === "red" ? "red-turn" : "black-turn"
    );
    // 更新文字
    indicator.textContent = `輪到${
      gameState.currentPlayer === "red" ? "紅方" : "黑方"
    }下棋`;
  }

  // 更新棋盤的當前玩家屬性
  boardElement.dataset.currentPlayer = gameState.currentPlayer;
}

function resetGame() {
  removeAllAnimations();
  const newGameBtn = document.querySelector(".new-game-btn");
  if (newGameBtn) {
    newGameBtn.remove();
  }

  // 清除所有遊戲狀態
  currentBoard = Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(null));
  selectedPiece = null;
  currentGameId = null;
  opponentId = null;
  playerRole = null;
  gameState = {
    currentPlayer: null,
    isGameOver: false,
  };

  // 重置 UI 元素
  const findMatchBtn = document.getElementById("findMatchBtn");
  const surrenderBtn = document.getElementById("surrenderBtn");
  const profileBtn = document.getElementById("profileBtn");
  const cancelMatchBtn = document.getElementById("cancelMatchBtn");

  if (findMatchBtn) {
    findMatchBtn.disabled = false;
  }

  if (surrenderBtn) {
    surrenderBtn.disabled = true;
  }

  if (cancelMatchBtn) {
    cancelMatchBtn.disabled = false;
  }

  if (profileBtn) {
    profileBtn.disabled = false; // 遊戲結束時重新啟用個人資料按鈕
  }

  const statusText = document.getElementById("statusText");
  if (statusText) {
    statusText.textContent = "等待開始遊戲...";
  }

  // 重置棋盤到初始等待狀態
  renderEmptyBoard();

  // 移除棋盤的所有特殊狀態
  const board = document.querySelector("#chessboard");
  if (board) {
    board.classList.remove("board-disabled", "check-flash", "checkmate-flash");
    board.style.animation = null;
  }

  // 停止等待計時器
  stopWaitingTimer();

  // 離開當前遊戲房間
  if (currentGameId) {
    socket.emit("leaveGame", { gameId: currentGameId });
  }

  // 清除遊戲會話
  socket.emit("cancelMatch");

  // 回到等待配對狀態
  hideWaitingScreen();
}

function startWaitingTimer() {
  try {
    stopWaitingTimer();
    waitingTime = 0;
    const timerElement = document.getElementById("waitingTimer");

    waitingTimer = setInterval(() => {
      waitingTime++;
      if (timerElement) {
        const minutes = Math.floor(waitingTime / 60);
        const seconds = waitingTime % 60;
        timerElement.textContent = `${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      }

      // 超過120秒的處理
      if (waitingTime >= 120) {
        stopWaitingTimer();
        hideWaitingScreen();
        socket.emit("cancelMatch"); // 取消配對
        alert("目前沒有玩家在線，請稍後再試");
        resetGame();
      }
    }, 1000);
  } catch (error) {
    console.error("計時器啟動錯誤:", error);
  }
}

function stopWaitingTimer() {
  if (waitingTimer) {
    clearInterval(waitingTimer);
    waitingTimer = null;
  }
  waitingTime = 0;
}

function handleMatchFound(data) {
  // 停止等待計時器並隱藏等待畫面
  stopWaitingTimer();
  hideWaitingScreen();

  // 保存遊戲信息
  currentGameId = data.gameId;
  opponentId = data.opponent.id;
  playerRole = data.opponent.role;

  console.log(
    `Match found! Game ID: ${currentGameId}, Opponent: ${opponentId}, Role: ${playerRole}`
  );

  // 更新遊戲狀態顯示
  const statusText = document.getElementById("statusText");
  if (statusText) {
    statusText.textContent = `遊戲開始！你是${
      playerRole === "red" ? "紅方" : "黑方"
    }`;
  }

  // 禁用配對相關按鈕
  const findMatchBtn = document.getElementById("findMatchBtn");
  const cancelMatchBtn = document.getElementById("cancelMatchBtn");
  if (findMatchBtn) {
    console.log("禁用配對按鈕");
    findMatchBtn.disabled = true;
  }
  if (cancelMatchBtn) {
    cancelMatchBtn.disabled = true;
  }

  // 啟用投降按鈕
  const surrenderBtn = document.getElementById("surrenderBtn");
  const profileBtn = document.getElementById("profileBtn");
  if (surrenderBtn) {
    surrenderBtn.disabled = false;
  }
  if (profileBtn) {
    profileBtn.disabled = true;
  }

  // 初始化遊戲狀態
  gameState = {
    currentPlayer: "red",
    gameId: currentGameId,
    playerRole: playerRole,
  };

  // 初始化並設置棋盤
  initializeBoard();
}

// 渲染空棋盤（用於等待配對時）
function renderEmptyBoard() {
  if (!boardElement) return;

  boardElement.innerHTML = "";
  currentBoard = Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(null));

  // 設置初始棋子位置
  setupInitialPieces();

  // 渲染棋盤和棋子，但禁用互動
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cellDiv = document.createElement("div");
      cellDiv.classList.add("cell");
      cellDiv.dataset.row = r;
      cellDiv.dataset.col = c;

      cellDiv.style.position = "absolute";
      cellDiv.style.width = "40px";
      cellDiv.style.height = "40px";
      cellDiv.style.left = offsetX + c * cellWidth + "px";
      cellDiv.style.top = offsetY + r * cellHeight + "px";
      cellDiv.style.transform = "translate(-50%, -50%)";

      // 如果該位置有棋子，創建棋子元素
      const piece = currentBoard[r][c];
      if (piece) {
        const pieceDiv = document.createElement("div");
        pieceDiv.classList.add("piece", piece.color, "disabled"); // 添加 disabled 類
        pieceDiv.innerText = piece.type;
        pieceDiv.dataset.row = r;
        pieceDiv.dataset.col = c;
        // 不添加點擊事件監聽器
        cellDiv.appendChild(pieceDiv);
      }

      boardElement.appendChild(cellDiv);
    }
  }

  // 添加整個棋盤的禁用樣式
  boardElement.classList.add("board-disabled");
}

// 添加點擊事件處理函數
function handleCellClick(event) {
  if (gameState.currentPlayer !== playerRole) {
    console.log("不是你的回合");
    return;
  }

  const cell = event.target.closest(".cell");
  if (!cell) return;

  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);
  const piece = currentBoard[row][col];

  if (piece) {
    // 如果點擊了棋子
    if (piece.color === playerRole) {
      // 選擇自己的棋子
      if (selectedPiece) {
        deselectPiece();
      }
      selectPiece(row, col, cell.querySelector(".piece"));
    } else if (selectedPiece) {
      // 如果已選中自己的棋子，且點擊對方棋子，嘗試吃子
      tryMove(selectedPiece.row, selectedPiece.col, row, col);
    }
  } else if (selectedPiece) {
    // 如果點擊空格且已選中棋子，嘗試移動
    tryMove(selectedPiece.row, selectedPiece.col, row, col);
  }
}

// 添加播放音效的函數
function playMoveSound(targetPiece) {
  if (targetPiece) {
    captureSound.play().catch((err) => console.error("播放音效失敗:", err));
  } else {
    moveSound.play().catch((err) => console.error("播放音效失敗:", err));
  }
}
async;

// 修改 tryMove 函數
async function tryMove(fromRow, fromCol, toRow, toCol) {
  const movingPiece = currentBoard[fromRow][fromCol];

  // 確保只能移動自己顏色的棋子
  if (movingPiece.color !== playerRole) {
    console.log("不能移動對方的棋子");
    return;
  }

  try {
    // 發送移動信息到服務器
    socket.emit("makeMove", {
      gameId: currentGameId,
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      piece: movingPiece,
    });

    // 不在這裡更新棋盤，等待服務器的 moveMade 事件
    deselectPiece();
  } catch (error) {
    console.error("移動失敗:", error);
    deselectPiece();
  }
}

// 添加遊戲狀態更新函數
function updateGameState(fromRow, fromCol, toRow, toCol) {
  // 保存移動的棋子
  const piece = currentBoard[fromRow][fromCol];

  // 更新棋盤狀態
  currentBoard[toRow][toCol] = piece;
  currentBoard[fromRow][fromCol] = null;

  // 重新渲染整個棋盤
  renderBoard();

  console.log("棋盤狀態已更新", {
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
    piece: piece,
  });
}

// 添加將死動畫
function showCheckmateAnimation() {
  const board = document.querySelector("#chessboard");
  // 先移除所有現有的動畫
  removeAllAnimations();
  // 添加將死動畫
  board.classList.add("checkmate-flash");
}

// 播放音效
function playSound(type) {
  const sounds = {
    move: moveSound,
    capture: captureSound,
    check: checkSound,
    checkmate: checkmateSound,
  };

  const sound = sounds[type];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch((err) => console.error("播放音效失敗:", err));
  }
}

// 顯示將軍動畫
function showCheckAnimation() {
  const board = document.querySelector("#chessboard");
  board.classList.add("check-flash");
  setTimeout(() => {
    board.classList.remove("check-flash");
  }, 1000);
}

// 添加一個移除所有動畫效果的函數
function removeAllAnimations() {
  const board = document.querySelector("#chessboard");
  if (board) {
    board.classList.remove("check-flash", "checkmate-flash");
    // 確保動畫完全停止
    board.style.animation = "none";
    board.offsetHeight; // 觸發重繪
    board.style.animation = null;
  }
}

// 添加一個顯示遊戲結果對話框的函數
function showGameResultDialog(message) {
  // 移除舊的對話框（如果存在）
  const oldDialog = document.querySelector(".game-result-dialog");
  if (oldDialog) {
    oldDialog.remove();
  }

  // 創建對話框
  const dialog = document.createElement("div");
  dialog.className = "game-result-dialog";

  // 創建結果文字
  const resultText = document.createElement("div");
  resultText.className = "result-text";
  resultText.textContent = message;

  // 創建按鈕容器
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "button-container";

  // 創建開始新局按鈕
  const newGameBtn = document.createElement("button");
  newGameBtn.textContent = "開始新局";
  newGameBtn.className = "dialog-btn new-game";
  newGameBtn.onclick = () => {
    dialog.remove();
    resetGame();
    socket.emit("findMatch");
    showWaitingScreen();
  };

  // 創建返回主頁按鈕
  const homeBtn = document.createElement("button");
  homeBtn.textContent = "返回主頁";
  homeBtn.className = "dialog-btn home";
  homeBtn.onclick = () => {
    dialog.remove();
    resetGame();
    const findMatchBtn = document.getElementById("findMatchBtn");
    if (findMatchBtn) {
      findMatchBtn.disabled = false;
    }
    const surrenderBtn = document.getElementById("surrenderBtn");
    if (surrenderBtn) {
      surrenderBtn.disabled = true;
    }
    const statusText = document.getElementById("statusText");
    if (statusText) {
      statusText.textContent = "等待開始遊戲...";
    }
    renderEmptyBoard();
  };

  // 組裝對話框
  buttonContainer.appendChild(newGameBtn);
  buttonContainer.appendChild(homeBtn);
  dialog.appendChild(resultText);
  dialog.appendChild(buttonContainer);

  // 將對話框添加到 game-container 而不是棋盤
  const gameContainer = document.querySelector(".game-container");
  if (gameContainer) {
    gameContainer.appendChild(dialog);
  }

  // 在顯示結果對話框後重新載入戰績
  loadUserStats().catch((error) => {
    console.error("載入戰績失敗:", error);
  });
}

// 修改 CSS 以適應新的位置
function addGameResultStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .game-container {
      position: relative;
    }
    
    .game-result-dialog {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1001; /* 確保在棋盤之上 */
    }
  `;
  document.head.appendChild(style);
}

// 在初始化時添加載入用戶戰績的函數
async function loadUserStats() {
  try {
    const response = await fetch("/api/user/stats");
    const stats = await response.json();

    // 更新 UI
    document.getElementById("winCount").textContent = stats.wins;
    document.getElementById("loseCount").textContent = stats.losses;
    document.getElementById("rating").textContent = stats.rating;
  } catch (error) {
    console.error("載入用戶戰績失敗:", error);
  }
}

function startReconnectTimer() {
  let timeLeft = 60; // 60秒重連時間
  const timerElement = document.getElementById("reconnectTimer");

  const timer = setInterval(() => {
    timeLeft--;
    if (timerElement) {
      timerElement.textContent = `${timeLeft}秒`;
    }
    if (timeLeft <= 0) {
      clearInterval(timer);
    }
  }, 1000);

  // 保存timer引用以便清除
  window.reconnectTimer = timer;
}
