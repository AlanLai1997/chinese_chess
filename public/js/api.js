// /public/js/api.js
const api = {
  async getGameState() {
    const response = await fetch("/api/game/state");
    if (!response.ok) throw new Error("无法获取游戏状态");
    return response.json();
  },

  async makeMove(fromRow, fromCol, toRow, toCol) {
    const response = await fetch("/api/game/move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fromRow, fromCol, toRow, toCol }),
    });
    if (!response.ok) throw new Error("无法移动棋子");
    return response.json();
  },

  async resetGame() {
    const response = await fetch("/api/game/reset", {
      method: "POST",
    });
    if (!response.ok) throw new Error("无法重置游戏");
    return response.json();
  },
};

// 如果需要導出
window.api = api;
