exports.calculateRatingChange = (winnerRating, loserRating) => {
  const K = 32;
  const expectedScore =
    1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  return Math.round(K * (1 - expectedScore));
};

exports.generateGameId = () => Math.random().toString(36).substr(2, 9);
