require("dotenv").config();
const io = require("socket.io-client");
const http = require("http");
const express = require("express");
const app = express();
const setupGameSocket = require("../src/websocket/gameSocket");
const db = require("../src/config/database");

const TEST_PORT = 3000;
let clientSockets = [];

// 設置全局超時為 60 秒
jest.setTimeout(120000);

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
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
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

describe.only("配對系統測試", () => {
  let server;

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
    server.listen(TEST_PORT, () => {
      console.log(`Test server running on port ${TEST_PORT}`);
      // 給服務器更多時間初始化
      setTimeout(done, 5000);
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

      // 關閉數據庫連接池
      await new Promise((resolve) => {
        db.end(() => {
          console.log("Database connection pool closed");
          resolve();
        });
      });
    } catch (error) {
      console.error("Cleanup error:", error);
      throw error;
    }
  });

  beforeEach(() => {
    clientSockets.forEach((socket) => socket.close());
    clientSockets = [];
  });
  // afterEach(async () => {
  //   try {
  //     // 清理所有客戶端連接
  //     await Promise.all(
  //       clientSockets.map((socket) => {
  //         return new Promise((resolve) => {
  //           if (!socket.connected) {
  //             resolve();
  //             return;
  //           }
  //           socket.on("disconnect", () => {
  //             console.log(`客戶端 ${socket.userId} 已斷開連接`);
  //             resolve();
  //           });
  //           socket.disconnect();
  //         });
  //       })
  //     );

  //     // 重置客戶端數組
  //     clientSockets = [];

  //     // 等待一段時間確保所有連接都已完全關閉
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     console.log("所有測試依賴項已清理完成");
  //   } catch (error) {
  //     console.error("清理過程中發生錯誤:", error);
  //     throw error;
  //   }
  // });

  test("同時多人尋找配對應正確配對", async () => {
    try {
      const clients = await Promise.all(
        testUsers.map((user) => createClient(user.id, TEST_PORT))
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
        waitForEvent(socket, "matchFound", 10000)
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

      // 確保所有客戶端都已準備就緒
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
      const processedPlayers = new Set();
      matchResults.forEach((match, playerId) => {
        // 如果這個玩家已經處理過了，跳過
        if (processedPlayers.has(playerId)) {
          return;
        }

        const pair = [playerId, match.opponentId].sort().join("-");
        console.log(`Validating pair: ${pair}`);
        expect(matchedPairs.has(pair)).toBe(false);
        matchedPairs.add(pair);
        // 標記這兩個玩家為已處理
        processedPlayers.add(playerId);
        processedPlayers.add(match.opponentId);
      });

      // 驗證配對數量是否正確
      expect(matchedPairs.size).toBe(testUsers.length / 2);
    } catch (error) {
      console.error("Test error:", error);
      throw error;
    }
  });

  test("取消配對應從等待隊列中移除", async () => {
    const client = await createClient(testUsers[0].id, TEST_PORT);
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

  test("重複加入配對隊列應被忽略", async () => {
    const client = await createClient(testUsers[0].id, TEST_PORT);
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
    expect(matchFoundCount).toBe(0); // 驗證沒有收到配對成功事件
  });

  test.only("玩家斷線後可以重連", async () => {
    const { clients, users } = await setupTestClients(2);
    const [player1, player2] = clients;

    // 開始遊戲
    const matchData = await startGame(player1, player2);
    let gameId;
    gameId = matchData.gameId;

    // 模擬玩家1斷線
    player1.disconnect();

    // 驗證對手收到斷線通知
    await new Promise((resolve) => {
      player2.on("opponent_disconnected", () => {
        resolve();
      });
    });
    console.log("opponent_disconnected");
    // 等待一段時間後重連
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 重新連接
    const reconnectedPlayer = await reconnectPlayer(users[0]);
    // 驗證重連成功並返回原遊戲
    await new Promise((resolve) => {
      player2.on("opponent_reconnected", () => {
        resolve();
      });
    });
    console.log("opponent_reconnected");
    console.log("reconnectedPlayer.connected", reconnectedPlayer.connected);
    // 驗證遊戲
    expect(reconnectedPlayer.connected).toBe(true);
  });

  test("玩家斷線超時後對手獲勝", async () => {
    const { clients, users } = await setupTestClients(2);
    const [player1, player2] = clients;

    // 開始遊戲
    await startGame(player1, player2);
    console.log("開始遊戲");
    // 模擬玩家1斷線
    player1.disconnect();

    // 等待超時
    await new Promise((resolve) => setTimeout(resolve, 60000));

    // 驗證對手獲勝
    const gameEndPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("等待遊戲結束超時"));
      }, 30000); // 10秒超時

      try {
        player2.on("gameover", (data) => {
          clearTimeout(timeout);
          try {
            expect(data.winner).toBe(users[1].id);
            expect(data.reason).toBe("disconnect");
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });

    await gameEndPromise;
  });
});

describe("配對系統壓力測試", () => {
  const CONCURRENT_USERS = 100;
  let server;
  let clients = [];
  const TEST_PORT = 4001; // 使用不同的測試端口

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

      server.listen(TEST_PORT, () => {
        console.log(`壓力測試服務器運行在端口 ${TEST_PORT}`);

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
      testUsers.map((user) => createClient(user.id, TEST_PORT))
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
      testUsers.map((user) => createClient(user.id, TEST_PORT))
    );

    const disconnectCount = Math.floor(RECONNECT_USERS / 4);
    const disconnectIndexes = generateUniqueIndexes(
      disconnectCount,
      RECONNECT_USERS
    );

    let disconnectEvents = 0;
    let reconnectEvents = 0;

    // 先執行斷線操作
    console.log("開始執行斷線操作...");
    await Promise.all(
      disconnectIndexes.map((index) => {
        return new Promise((resolve) => {
          initialClients[index].on("disconnect", () => {
            disconnectEvents++;
            console.log(`玩家 ${testUsers[index].id} 已斷線`);
            resolve();
          });
          initialClients[index].close();
        });
      })
    );

    // 修改重連邏輯
    const reconnectedClients = await Promise.all(
      disconnectIndexes.map((index) => {
        return new Promise((resolve) => {
          console.log(`玩家 ${testUsers[index].id} 嘗試重連...`);
          const socket = io(`http://localhost:${TEST_PORT}`, {
            auth: { userId: testUsers[index].id },
            transports: ["websocket"],
            reconnection: true, // 確保啟用重連
            reconnectionAttempts: 3,
          });

          socket.on("connect", () => {
            reconnectEvents++;
            console.log(`玩家 ${testUsers[index].id} 重連成功`);
            resolve(socket);
          });

          socket.on("connect_error", (error) => {
            console.log(`玩家 ${testUsers[index].id} 重連失敗:`, error);
          });

          // 添加超時處理
          setTimeout(() => {
            if (!socket.connected) {
              console.log(`玩家 ${testUsers[index].id} 重連超時`);
              socket.close();
              resolve(null); // 返回 null 表示重連失敗
            }
          }, 10000);
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

// 測試輔助函數
async function setupTestClients(numClients) {
  const testUsers = Array.from({ length: numClients }, (_, i) => ({
    id: i + 1,
    username: `player${i + 1}`,
    rating: 1500,
  }));

  const clients = await Promise.all(
    testUsers.map((user) => createClient(user.id, TEST_PORT))
  );

  // 將新創建的客戶端加入到 clientSockets 數組
  clientSockets.push(...clients);

  return {
    clients,
    users: testUsers,
  };
}

async function startGame(player1, player2) {
  return new Promise((resolve) => {
    let player1Data = null;
    let player2Data = null;

    // 監聽玩家1的配對成功事件
    player1.once("matchFound", (data) => {
      console.log("玩家1配對成功:", data);
      player1Data = data;
      if (player2Data) {
        resolve(player1Data); // 如果兩個玩家都配對成功，返回玩家1的數據
      }
    });

    // 監聽玩家2的配對成功事件
    player2.once("matchFound", () => {
      console.log("玩家2配對成功");
      player2Data = true;
      if (player1Data) {
        resolve(player1Data); // 如果兩個玩家都配對成功，返回玩家1的數據
      }
    });

    // 發送配對請求
    player1.emit("findMatch");
    player2.emit("findMatch");
  });
}

async function reconnectPlayer(user) {
  // 創建新的連接
  const newSocket = await createClient(user.id, TEST_PORT);

  // 等待重連成功
  await new Promise((resolve) => {
    newSocket.once("game_state_sync", (data) => {
      console.log("重連同步數據:", data);
      resolve();
    });

    // 發送重連請求
    newSocket.emit("reconnect");
  });

  return newSocket;
}
