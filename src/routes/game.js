const express = require("express");
const router = express.Router();
const gameController = require("../controllers/gameController");

router.get("/state", gameController.getGameState);
router.post("/reset", gameController.resetGame);
router.post("/move", gameController.makeMove);

module.exports = router;
