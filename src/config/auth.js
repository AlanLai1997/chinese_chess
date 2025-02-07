// auth.js - Frontend authentication handling

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }
});

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      window.location.href = "/game";
    } else {
      alert(data.message || "登入失敗，請檢查您的帳號密碼。");
    }
  } catch (error) {
    console.error("登入錯誤:", error);
    alert("登入時發生錯誤，請稍後再試。");
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // 基本驗證
  if (password !== confirmPassword) {
    alert("密碼不匹配！");
    return;
  }

  if (password.length < 6) {
    alert("密碼長度必須至少為6個字符！");
    return;
  }

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      alert("註冊成功！");
      window.location.href = "/login";
    } else {
      alert(data.message || "註冊失敗，請稍後再試。");
    }
  } catch (error) {
    console.error("註冊錯誤:", error);
    alert("註冊時發生錯誤，請稍後再試。");
  }
}
