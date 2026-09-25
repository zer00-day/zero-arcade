const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const express = require("express");

const app = express();
const PORT = 3000;
const ROOT_DIR = path.join(__dirname, "..");
const DATABASE_PATH = path.join(ROOT_DIR, "data", "zero-arcade.db");

const db = new DatabaseSync(DATABASE_PATH, {
    timeout: 5000,
    enableForeignKeyConstraints: true
});

app.use(express.json());

app.get("/api/health", (req, res) => {
    try {
        const result = db.prepare("SELECT 1 AS ok").get();

        res.json({
            ok: result.ok === 1,
            service: "zero-arcade",
            database: true
        });
    } catch {
        res.status(500).json({
            ok: false,
            service: "zero-arcade",
            database: false
        });
    }
});

app.use(express.static(ROOT_DIR));

app.use((req, res) => {
    res.status(404).json({
        error: "NOT_FOUND"
    });
});

const server = app.listen(PORT, "127.0.0.1", () => {
    console.log(`Zero Arcade server running at http://127.0.0.1:${PORT}`);
});

function shutdown() {
    server.close(() => {
        db.close();
        process.exit(0);
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);