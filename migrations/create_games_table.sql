CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(255) NOT NULL,
    winner_id INTEGER NOT NULL,
    end_reason VARCHAR(50) NOT NULL,
    moves JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT games_winner_id_fkey 
        FOREIGN KEY (winner_id) 
        REFERENCES users(id)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_games_game_id ON games (game_id);
CREATE INDEX IF NOT EXISTS idx_games_winner_id ON games (winner_id); 