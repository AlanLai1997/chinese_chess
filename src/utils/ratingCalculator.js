// src/utils/ratingCalculator.js

// Elo 积分计算
function calculateNewRating(playerRating, opponentRating, result) {
  const K = 32; // K因子，决定积分变动幅度
  const expectedScore =
    1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actualScore = result === "win" ? 1 : result === "loss" ? 0 : 0.5;

  return Math.round(K * (actualScore - expectedScore));
}

// 计算积分变化
function calculateRatingChange(winnerRating, loserRating) {
  const K = 32;
  const expectedScore =
    1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  return Math.round(K * (1 - expectedScore));
}

// 生成游戏ID
function generateGameId() {
  return Math.random().toString(36).substr(2, 9);
}

// 验证工具
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateUsername(username) {
  return (
    username.length >= 3 &&
    username.length <= 20 &&
    /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)
  );
}

function validatePassword(password) {
  return password.length >= 6;
}

module.exports = {
  calculateNewRating,
  calculateRatingChange,
  generateGameId,
  validateEmail,
  validateUsername,
  validatePassword,
};
