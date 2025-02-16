// 验证工具
function validateEmail(email) {
  // 檢查是否已經存在相同的電子郵件
  const db = require("../config/database");

  // 1. 首先驗證電子郵件格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }

  // 2. 檢查是否已存在
  return db
    .query("SELECT * FROM users WHERE email = $1", [email])
    .then((result) => {
      return result.rows.length === 0; // 如果沒有找到重複的，返回 true
    })
    .catch((error) => {
      console.error("檢查電子郵件時出錯:", error);
      return false;
    });
}

function validateUsername(username) {
  // 檢查長度
  if (username.length < 3 || username.length > 20) {
    return {
      isValid: false,
      error: "用戶名長度必須在3-20個字符之間",
    };
  }

  // 檢查字符
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    return {
      isValid: false,
      error: "用戶名只能包含字母、數字、底線和中文",
    };
  }

  return {
    isValid: true,
  };
}

function validatePassword(password) {
  return password.length >= 6;
}

module.exports = {
  validateEmail,
  validateUsername,
  validatePassword,
};
