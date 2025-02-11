const request = require("supertest");
const app = require("../server"); // 確保 server.js 導出 app
const db = require("../src/config/database");

describe("認證系統測試", () => {
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    password: "testpass123",
  };

  afterAll(async () => {
    // 清理測試數據
    await db.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  });

  describe("註冊功能", () => {
    test("應該成功註冊新用戶", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send(testUser)
        .expect(200);

      expect(response.body).toHaveProperty("message", "註冊成功");
    });

    test("重複的電子郵件應該失敗", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send(testUser)
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    test("無效的用戶名應該失敗", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ ...testUser, username: "a" }) // 太短的用戶名
        .expect(400);

      expect(response.body).toHaveProperty("error");
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

      expect(response.body).toHaveProperty("error");
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
