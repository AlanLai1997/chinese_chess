// profile.js - Frontend profile handling

document.addEventListener("DOMContentLoaded", () => {
  loadProfile();
});

async function loadProfile() {
  try {
    const response = await fetch("/api/user/profile");
    const data = await response.json();

    if (response.ok) {
      // 填充基本資料
      document.getElementById("username").value = data.username;
      document.getElementById("email").value = data.email;
      document.getElementById("rating").textContent = data.rating;

      // 填充遊戲統計
      document.getElementById("totalGames").textContent = data.stats.totalGames;
      document.getElementById("wins").textContent = data.stats.wins;
      document.getElementById("losses").textContent = data.stats.losses;
      document.getElementById("draws").textContent = data.stats.draws;
    } else {
      alert("獲取資料失敗：" + data.message);
    }
  } catch (error) {
    console.error("載入資料時發生錯誤:", error);
    alert("載入資料時發生錯誤，請稍後再試。");
  }
}
