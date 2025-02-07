// src/utils/ratingCalculator.js

// Elo 積分計算
function calculateNewRating(playerRating, opponentRating, result) {
  const K = 32; // K因子，決定積分變動幅度
  const expectedScore =
    1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actualScore = result === "win" ? 1 : result === "loss" ? 0 : 0.5;

  return Math.round(K * (actualScore - expectedScore));
}

// 驗證工具
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
  validateEmail,
  validateUsername,
  validatePassword,
};
