const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const databasePath = path.join(__dirname, "..", "data", "zero-arcade.db");

const db = new DatabaseSync(databasePath, {
    timeout: 5000,
    enableForeignKeyConstraints: true
});

db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('PLAYER', 'DEVELOPER')),
        status TEXT NOT NULL DEFAULT 'active'
            CHECK (status IN ('active', 'suspended')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY,
        device_key_hash TEXT NOT NULL UNIQUE,
        account_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
            CHECK (status IN ('active', 'revoked')),
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        FOREIGN KEY (account_id)
            REFERENCES accounts(id)
            ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS profiles (
        account_id INTEGER PRIMARY KEY,
        tag TEXT NOT NULL UNIQUE COLLATE NOCASE,
        player_id TEXT NOT NULL UNIQUE,
        avatar_data TEXT NOT NULL DEFAULT '',
        avatar_changes_used INTEGER NOT NULL DEFAULT 0,
        avatar_next_change_at TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (account_id)
            REFERENCES accounts(id)
            ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY,
        account_id INTEGER NOT NULL,
        session_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT NOT NULL DEFAULT '',
        FOREIGN KEY (account_id)
            REFERENCES accounts(id)
            ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS game_scores (
        id INTEGER PRIMARY KEY,
        account_id INTEGER NOT NULL,
        game_key TEXT NOT NULL,
        score INTEGER NOT NULL,
        achieved_at TEXT NOT NULL,
        FOREIGN KEY (account_id)
            REFERENCES accounts(id)
            ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_devices_account_id
        ON devices(account_id);

    CREATE INDEX IF NOT EXISTS idx_sessions_account_id
        ON sessions(account_id);

    CREATE INDEX IF NOT EXISTS idx_game_scores_account_game
        ON game_scores(account_id, game_key);
`);

console.log("Zero Arcade database initialized.");
console.log(`Database: ${databasePath}`);

db.close();