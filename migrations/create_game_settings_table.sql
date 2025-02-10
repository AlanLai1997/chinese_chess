CREATE TABLE IF NOT EXISTS game_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE,
    sound_enabled BOOLEAN DEFAULT true,
    animation_enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT game_settings_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES users(id)
); 