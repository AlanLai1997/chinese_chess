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
  validateEmail,
  validateUsername,
  validatePassword,
};
