CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

-- 創建過期時間索引
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session (expire); 