document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(loginForm);
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.get("email"),
            password: formData.get("password"),
          }),
        });

        const data = await response.json();
        if (data.success) {
          // 保存用戶ID到localStorage
          localStorage.setItem("userId", data.user.id);
          window.location.href = "/game";
        } else {
          alert(data.message || "登入失敗");
        }
      } catch (error) {
        console.error("登入錯誤:", error);
        alert("登入時發生錯誤");
      }
    });
  }
});
