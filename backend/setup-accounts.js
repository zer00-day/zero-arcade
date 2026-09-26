const { db } = require("./database");
const { hashPassword } = require("./security");

const DEFAULT_DEVELOPER_EMAIL = "zero.dev@zeroarcade.com";
const DEFAULT_PLAYER_EMAIL = "player@zeroarcade.com";

function generatePassword(length = 20) {
    const alphabet =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

    const values = new Uint32Array(length);

    require("node:crypto").randomFillSync(
        values
    );

    let password = "";

    for (let index = 0; index < length; index += 1) {
        password += alphabet[
            values[index] % alphabet.length
        ];
    }

    return password;
}

function ensureAccount(
    email,
    password,
    role
) {
    const existing = db.prepare(`
        SELECT
            id,
            email,
            role,
            status
        FROM accounts
        WHERE email = ?
        LIMIT 1
    `).get(email);

    if (existing) {
        return {
            created: false,
            account: existing
        };
    }

    const now = new Date().toISOString();

    const result = db.prepare(`
        INSERT INTO accounts (
            email,
            password_hash,
            role,
            status,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, 'active', ?, ?)
    `).run(
        email,
        hashPassword(password),
        role,
        now,
        now
    );

    return {
        created: true,
        account: {
            id: result.lastInsertRowid,
            email,
            role,
            status: "active"
        }
    };
}

const developerEmail =
    process.env.ZERO_ARCADE_DEVELOPER_EMAIL ||
    DEFAULT_DEVELOPER_EMAIL;

const playerEmail =
    process.env.ZERO_ARCADE_PLAYER_EMAIL ||
    DEFAULT_PLAYER_EMAIL;

const developerPassword =
    process.env.ZERO_ARCADE_DEVELOPER_PASSWORD ||
    generatePassword();

const playerPassword =
    process.env.ZERO_ARCADE_PLAYER_PASSWORD ||
    generatePassword();

const developer = ensureAccount(
    developerEmail,
    developerPassword,
    "DEVELOPER"
);

const player = ensureAccount(
    playerEmail,
    playerPassword,
    "PLAYER"
);

console.log("");

if (developer.created) {
    console.log("Developer account created.");
    console.log(`Email: ${developerEmail}`);

    if (process.env.ZERO_ARCADE_DEVELOPER_PASSWORD) {
        console.log("Password source: local environment variable.");
    } else {
        console.log(`Password: ${developerPassword}`);
    }
} else {
    console.log("Developer account already exists.");
    console.log(`Email: ${developerEmail}`);
}

console.log("");

if (player.created) {
    console.log("Player account created.");
    console.log(`Email: ${playerEmail}`);

    if (process.env.ZERO_ARCADE_PLAYER_PASSWORD) {
        console.log("Password source: local environment variable.");
    } else {
        console.log(`Password: ${playerPassword}`);
    }
} else {
    console.log("Player account already exists.");
    console.log(`Email: ${playerEmail}`);
}

console.log("");
console.log("Account setup complete.");

db.close();