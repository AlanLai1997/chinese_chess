require("dotenv").config();
const io = require("socket.io-client");
const http = require("http");
const express = require("express");
const app = express();
const setupGameSocket = require("../src/websocket/gameSocket");
const db = require("../src/config/database");

// 設置全局超時為 60 秒
jest.setTimeout(100000);

// 修改 createClient 函數，添加連接超時處理
const createClient = (userId, port) => {
  return new Promise((resolve, reject) => {
    const SOCKET_URL = `http://localhost:${port}`;
    const socket = io(SOCKET_URL, {
      auth: { userId },
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      path: "/socket.io/",
      withCredentials: true,
    });

    let connectTimeout = setTimeout(() => {
      if (!socket.connected) {
        socket.close();
        reject(new Error("連接超時"));
      }
    }, 15000);

    socket.on("connect", () => {
      clearTimeout(connectTimeout);
      socket.userId = userId;
      socket.emit("auth", userId);
      resolve(socket);
    });

    socket.on("connect_error", (error) => {
      console.error(`Connection error (${userId}):`, error);
      clearTimeout(connectTimeout);
      reject(error);
    });
  });
};

// 生成唯一的斷開連接索引
const generateUniqueIndexes = (count, max) => {
  const indexes = Array.from({ length: max }, (_, i) => i);
  for (let i = indexes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }
  return indexes.slice(0, count);
};

// 等待特定事件或超時
const waitForEvent = (socket, event, timeout = 5000) => {
  return Promise.race([
    new Promise((resolve) => socket.once(event, resolve)),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`等待${event}超時`)), timeout)
    ),
  ]);
};

describe("配對系統測試", () => {
  let server;
  let clientSockets = [];
  const PORT = 4000; // 修改為正確的端口

  const testUsers = [
    { id: 1, username: "player1", rating: 1500 },
    { id: 2, username: "player2", rating: 1500 },
    { id: 3, username: "player3", rating: 1600 },
    { id: 4, username: "player4", rating: 1400 },
  ];

  beforeAll((done) => {
    server = http.createServer(app);
    const ioServer = require("socket.io")(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingTimeout: 60000,
      pingInterval: 25000,
      allowEIO3: true,
      path: "/socket.io/",
    });

    // 添加連接錯誤監聽
    ioServer.engine.on("connection_error", (err) => {
      console.log("Connection error:", err);
    });

    setupGameSocket(ioServer);

    // 確保服務器完全啟動
    server.listen(PORT, () => {
      console.log(`Test server running on port ${PORT}`);
      // 給服務器一點時間完全初始化
      setTimeout(done, 2000);
    });
  });

  afterAll(async () => {
    try {
      // 先關閉所有客戶端
      await Promise.all(
        clientSockets.map(
          (socket) =>
            new Promise((resolve) => {
              if (!socket.connected) {
                resolve();
                return;
              }
              socket.on("disconnect", () => {
                console.log(`Client ${socket.userId} disconnected`);
                resolve();
              });
              socket.close();
            })
        )
      );

      // 然後關閉服務器
      if (server.listening) {
        await new Promise((resolve, reject) => {
          server.close((err) => {
            if (err) {
              console.error("Server close error:", err);
              reject(err);
            } else {
              console.log("Server closed successfully");
              resolve();
            }
          });
        });
      }
    } catch (error) {
      console.error("Cleanup error:", error);
      throw error;
    }
  });

  beforeEach(() => {
    clientSockets.forEach((socket) => socket.close());
    clientSockets = [];
  });

  test("同時多人尋找配對應正確配對", async () => {
    try {
      const clients = await Promise.all(
        testUsers.map((user) => createClient(user.id, PORT))
      );
      clientSockets = clients;

      // 添加日誌來追蹤連接狀態
      clients.forEach((socket, index) => {
        console.log(
          `Client ${testUsers[index].id} connected: ${socket.connected}`
        );

        // 監聽所有相關事件
        socket.on("error", (error) =>
          console.error(`Client ${testUsers[index].id} error:`, error)
        );
        socket.on("disconnect", () =>
          console.log(`Client ${testUsers[index].id} disconnected`)
        );
      });

      const matchResults = new Map();
      const matchPromises = clients.map((socket, index) =>
        waitForEvent(socket, "matchFound", 10000) // 增加超時時間
          .then((data) => {
            console.log(
              `Client ${testUsers[index].id} matched with ${data.opponent.id}`
            );
            matchResults.set(testUsers[index].id, {
              opponentId: data.opponent.id,
            });
          })
          .catch((error) => {
            console.error(`Client ${testUsers[index].id} match error:`, error);
            throw error;
          })
      );

      // 確保所有客戶端都已連接
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Sending findMatch events...");
      // 同時發送所有配對請求
      clients.forEach((socket, index) => {
        socket.emit("findMatch");
        console.log(`Client ${testUsers[index].id} sent findMatch`);
      });

      await Promise.all(matchPromises);

      // 驗證配對結果
      const matchedPairs = new Set();
      matchResults.forEach((match, playerId) => {
        const pair = [playerId, match.opponentId].sort().join("-");
        console.log(`Validating pair: ${pair}`);
        expect(matchedPairs.has(pair)).toBe(false);
        matchedPairs.add(pair);
      });
    } catch (error) {
      console.error("Test error:", error);
      throw error;
    }
  });

  test("應該根據積分範圍進行配對", async () => {
    const [player1, player2] = await Promise.all([
      createClient(testUsers[0].id, PORT),
      createClient(testUsers[2].id, PORT), // 積分差距較大的玩家
    ]);
    clientSockets = [player1, player2];

    let timeoutOccurred = false;
    const matchPromise = new Promise((resolve) => {
      player1.on("matchFound", resolve);
      player2.on("matchFound", resolve);

      player1.emit("findMatch");
      player2.emit("findMatch");

      // 設置超時，因為我們預期這些玩家不應該被配對
      setTimeout(() => {
        timeoutOccurred = true;
        resolve(null);
      }, 3000);
    });

    const result = await matchPromise;
    expect(timeoutOccurred).toBe(true);
    expect(result).toBeNull();
  });

  test("取消配對應從等待隊列中移除", async () => {
    const client = await createClient(testUsers[0].id, PORT);
    clientSockets = [client];

    let matchFound = false;
    client.on("matchFound", () => {
      matchFound = true;
    });

    client.emit("findMatch");
    await new Promise((resolve) => setTimeout(resolve, 100));
    client.emit("cancelMatch");

    // 等待一段時間確保沒有配對發生
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(matchFound).toBe(false);
  });

  test("斷線時應從等待隊列中移除", async () => {
    const [client1, client2] = await Promise.all([
      createClient(testUsers[0].id, PORT),
      createClient(testUsers[1].id, PORT),
    ]);
    clientSockets = [client1, client2];

    let client2MatchFound = false;
    client2.on("matchFound", () => {
      client2MatchFound = true;
    });

    client1.emit("findMatch");
    client2.emit("findMatch");

    // 模擬client1斷線
    await new Promise((resolve) => setTimeout(resolve, 100));
    client1.close();

    // 等待確保client2沒有收到配對
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(client2MatchFound).toBe(false);
  });

  test("重複加入配對隊列應被忽略", async () => {
    const client = await createClient(testUsers[0].id, PORT);
    clientSockets = [client];

    let matchFoundCount = 0;
    client.on("matchFound", () => {
      matchFoundCount++;
    });

    // 連續多次請求配對
    for (let i = 0; i < 5; i++) {
      client.emit("findMatch");
    }

    // 等待確保只處理一次
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 檢查是否仍在等待隊列中
    client.emit("getQueueStatus", (status) => {
      expect(status.inQueue).toBe(true);
      expect(status.queueTime).toBeDefined();
    });
  });
});

describe("配對系統壓力測試", () => {
  const CONCURRENT_USERS = 100;
  let server;
  let clients = [];
  const PORT = 4001; // 使用不同的端口

  const monitorMatches = (clients) => {
    const matches = new Set();
    const matchPromises = clients.map((socket) =>
      waitForEvent(socket, "matchFound").then((data) => {
        // 確保每個配對只被計算一次，使用排序確保順序一致
        const pair = [socket.userId, data.opponent.id].sort().join("-");
        matches.add(pair);
        return data;
      })
    );
    return { matches, matchPromises };
  };

  beforeAll((done) => {
    server = http.createServer(app);
    const ioServer = require("socket.io")(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingTimeout: 60000,
      pingInterval: 25000,
      allowEIO3: true,
    });

    // 監聽連接事件
    ioServer.on("connection", (socket) => {
      console.log("壓力測試 - 新的客戶端連接:", socket.id);
    });

    setupGameSocket(ioServer);

    // 檢查數據庫連接
    db.query("SELECT NOW()", (err) => {
      if (err) {
        console.error("壓力測試 - 數據庫連接錯誤:", err);
        done(err);
        return;
      }

      console.log("壓力測試 - 數據庫連接成功");

      server.listen(PORT, () => {
        console.log(`壓力測試服務器運行在端口 ${PORT}`);

        setTimeout(() => {
          console.log("壓力測試服務器初始化完成");
          done();
        }, 2000);
      });
    });
  });

  afterAll(async () => {
    // 等待所有 socket 完全關閉
    await Promise.all(
      clients.map(
        (socket) =>
          new Promise((resolve) => {
            socket.on("disconnect", resolve);
            socket.close();
          })
      )
    );
    // 等待服務器完全關閉
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  test("應該能夠同時處理大量配對請求", async () => {
    const testUsers = Array.from({ length: CONCURRENT_USERS }, (_, i) => ({
      id: i + 1,
      username: `player${i + 1}`,
      rating: 1500 + Math.floor(Math.random() * 200) - 100,
    }));

    clients = await Promise.all(
      testUsers.map((user) => createClient(user.id, PORT))
    );

    const { matches, matchPromises } = monitorMatches(clients);
    const startTime = Date.now();

    clients.forEach((socket) => socket.emit("findMatch"));

    await Promise.all(matchPromises);

    const duration = Date.now() - startTime;
    expect(matches.size).toBe(CONCURRENT_USERS / 2);
    expect(duration).toBeLessThan(10000);

    // 檢查配對的合理性
    Array.from(matches).forEach((matchStr) => {
      const [id1, id2] = matchStr.split("-").map(Number);
      const user1 = testUsers.find((u) => u.id === id1);
      const user2 = testUsers.find((u) => u.id === id2);
      expect(Math.abs(user1.rating - user2.rating)).toBeLessThan(300);
    });
  });

  test("應該能夠處理用戶斷線重連的情況", async () => {
    const RECONNECT_USERS = 20;
    const testUsers = Array.from({ length: RECONNECT_USERS }, (_, i) => ({
      id: i + 1,
      username: `player${i + 1}`,
      rating: 1500,
    }));

    const initialClients = await Promise.all(
      testUsers.map((user) => createClient(user.id, PORT))
    );

    const disconnectCount = Math.floor(RECONNECT_USERS / 4);
    const disconnectIndexes = generateUniqueIndexes(
      disconnectCount,
      RECONNECT_USERS
    );

    let disconnectEvents = 0;
    let reconnectEvents = 0;

    // 修改重連邏輯
    const reconnectedClients = await Promise.all(
      disconnectIndexes.map((index) => {
        return new Promise((resolve) => {
          const socket = io(`http://localhost:${PORT}`, {
            auth: { userId: testUsers[index].id },
            transports: ["websocket"],
            reconnection: true, // 確保啟用重連
            reconnectionAttempts: 3,
          });

          socket.on("connect", () => {
            reconnectEvents++;
            resolve(socket);
          });

          socket.on("connect_error", (error) => {
            console.log("重連錯誤:", error);
          });
        });
      })
    );

    // 然後斷開原來的連接
    await Promise.all(
      disconnectIndexes.map((index) => {
        return new Promise((resolve) => {
          initialClients[index].on("disconnect", () => {
            disconnectEvents++;
            resolve();
          });
          initialClients[index].close();
        });
      })
    );

    expect(disconnectEvents).toBe(disconnectCount);
    expect(reconnectEvents).toBeGreaterThan(0);

    [...initialClients, ...reconnectedClients].forEach((socket) =>
      socket.close()
    );
  });
});
