const request = require("supertest");
const app = require("../server"); // 使用實際運行的服務器
const db = require("../src/config/database");

describe("認證系統測試", () => {
  const testUser = {
    username: `testuser`,
    email: `test@example.com`,
    password: "testpass123",
  };
  console.log(testUser.username);

  // beforeEach(async () => {
  //   // 在每個測試前清理數據庫中的測試用戶
  //   await db.query(
  //     "DELETE FROM game_settings WHERE user_id IN (SELECT id FROM users WHERE email = $1)",
  //     [testUser.email]
  //   );
  //   await db.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  // });

  beforeAll(async () => {
    // 等待數據庫連接就緒
    await new Promise((resolve) => {
      db.query("SELECT NOW()", (err) => {
        if (err) throw err;
        resolve();
      });
    });

    // 等待 session 表創建完成
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // 最後清理
    await db.query(
      "DELETE FROM game_settings WHERE user_id IN (SELECT id FROM users WHERE email = $1)",
      [testUser.email]
    );
    await db.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  });

  describe("註冊功能", () => {
    test("應該成功註冊新用戶", async () => {
      // 打印可用的路由
      console.log(
        "Available routes:",
        app._router.stack.map((layer) => {
          if (layer.route) {
            return `Route: ${Object.keys(layer.route.methods)} ${
              layer.route.path
            }`;
          } else if (layer.name === "router") {
            return `Router middleware: ${layer.regexp}`;
          } else {
            return `Middleware: ${layer.name}`;
          }
        })
      );

      const response = await request(app)
        .post("/api/auth/register")
        .set("Content-Type", "application/json")
        .send(testUser)
        .expect((res) => {
          console.log("Request path:", "/api/auth/register");
          console.log("Request body:", testUser);
          console.log("Request headers:", {
            "Content-Type": "application/json",
          });
          console.log("Response:", {
            status: res.status,
            body: res.body,
            headers: res.headers,
          });
        })
        .expect(200);

      expect(response.body).toHaveProperty("message", "註冊成功");
    });

    test("重複的電子郵件應該失敗", async () => {
      // 先註冊一個用戶

      // 然後嘗試用相同的郵箱再次註冊
      const response = await request(app)
        .post("/api/auth/register")
        .send(testUser)
        .expect(400);

      expect(response.body).toHaveProperty("message", "此電子郵件已被註冊");
    });

    test("無效的用戶名應該失敗", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ ...testUser, username: "a" })
        .expect(400);

      expect(response.body).toHaveProperty(
        "message",
        "用戶名長度必須在3-20個字符之間"
      );
    });
  });

  describe("登入功能", () => {
    test("正確的憑證應該成功登入", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });

    test("錯誤的密碼應該失敗", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "密碼錯誤");
    });

    test("不存在的用戶應該失敗", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "anypassword",
        })
        .expect(401);

      expect(response.body).toHaveProperty("error");
    });
  });
});
