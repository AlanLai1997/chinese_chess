// middleware/auth.js

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "請先登入" });
};

const ensureNotAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.status(400).json({ message: "您已經登入" });
};

const checkGameAccess = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "請先登入" });
  }

  // 如果需要檢查特定遊戲的訪問權限，可以在這裡添加邏輯
  const gameId = req.params.gameId;
  if (gameId) {
    // 檢查是否是遊戲的參與者
    const isParticipant = await GameModel.checkParticipant(gameId, req.user.id);
    if (!isParticipant) {
      return res.status(403).json({ message: "您沒有權限訪問此遊戲" });
    }
  }

  next();
};

// 檢查用戶是否已登入的中間件
const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "未登入" });
  }
  next();
};

module.exports = {
  ensureAuthenticated,
  ensureNotAuthenticated,
  checkGameAccess,
  requireAuth,
};
