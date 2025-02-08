document
  .getElementById("registerForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("表單提交觸發");

    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      alert("密碼不匹配");
      return;
    }

    const formData = {
      username: document.getElementById("username").value,
      email: document.getElementById("email").value,
      password: document.getElementById("password").value,
    };

    console.log("準備發送的數據:", formData);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      console.log("服務器響應狀態:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("註冊成功響應:", data);
        if (data.message === "註冊成功") {
          window.location.href = "/game";
        }
      } else {
        const data = await response.json();
        console.log("註冊失敗響應:", data);
        alert(data.error || "註冊失敗");
      }
    } catch (error) {
      console.error("註冊錯誤:", error);
      alert("註冊失敗，請稍後再試");
    }
  });
