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

// async function loadGameHistory() {
//   try {
//     const response = await fetch("/api/user/game-history");
//     const data = await response.json();

//     if (response.ok) {
//       const historyBody = document.getElementById("historyBody");
//       historyBody.innerHTML = ""; // 清空現有內容

//       data.history.forEach((game) => {
//         const row = document.createElement("tr");

//         // 格式化日期
//         const date = new Date(game.date).toLocaleDateString("zh-TW");

//         // 設置積分變化的樣式
//         const ratingChange = game.ratingChange;
//         const ratingChangeText =
//           ratingChange > 0 ? `+${ratingChange}` : ratingChange;
//         const ratingChangeClass =
//           ratingChange > 0 ? "text-success" : "text-danger";

//         row.innerHTML = `
//             <td>${date}</td>
//             <td>${game.opponent}</td>
//             <td>${game.result}</td>
//             <td class="${ratingChangeClass}">${ratingChangeText}</td>
//           `;

//         historyBody.appendChild(row);
//       });
//     } else {
//       alert("獲取對戰記錄失敗：" + data.message);
//     }
//   } catch (error) {
//     console.error("載入對戰記錄時發生錯誤:", error);
//     alert("載入對戰記錄時發生錯誤，請稍後再試。");
//   }
// }
