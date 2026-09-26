const path = require("node:path");

const express = require("express");

const { db } = require("./database");

const {
    createToken,
    hashToken,
    verifyPassword
} = require("./security");

const app = express();

const PORT = 3000;

const ROOT_DIR = path.join(__dirname, "..");

const SESSION_COOKIE = "zero_arcade_session";

const DEVICE_COOKIE = "zero_arcade_device";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

const DEVICE_TTL_SECONDS = 365 * 24 * 60 * 60;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

app.disable("x-powered-by");

app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()"
    );
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    );
    next();
});

app.use(express.json({
    limit: "32kb"
}));

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        res.status(400).json({
            ok: false,
            error: "INVALID_JSON"
        });
        return;
    }

    if (err?.type === "entity.too.large" || err?.status === 413) {
        res.status(413).json({
            ok: false,
            error: "PAYLOAD_TOO_LARGE"
        });
        return;
    }

    next(err);
});

function parseCookies(header = "") {
    const cookies = {};

    header.split(";").forEach((part) => {
        const separator = part.indexOf("=");

        if (separator === -1) {
            return;
        }

        const name = part.slice(0, separator).trim();

        const value = part.slice(separator + 1).trim();

        if (!name) {
            return;
        }

        try {
            cookies[name] = decodeURIComponent(value);
        } catch {
            cookies[name] = value;
        }
    });

    return cookies;
}

function addCookie(res, cookie) {
    const current = res.getHeader("Set-Cookie");

    if (!current) {
        res.setHeader("Set-Cookie", [cookie]);
        return;
    }

    const next = Array.isArray(current)
        ? [...current, cookie]
        : [current, cookie];

    res.setHeader("Set-Cookie", next);
}

function serializeCookie(
    name,
    value,
    {
        maxAge,
        httpOnly = true,
        sameSite = "Lax",
        secure = IS_PRODUCTION,
        path = "/",
        clear = false
    }
) {
    const parts = [
        `${name}=${encodeURIComponent(value)}`,
        `Path=${path}`,
        `SameSite=${sameSite}`,
        `Max-Age=${Math.max(0, Math.floor(maxAge))}`
    ];

    if (httpOnly) {
        parts.push("HttpOnly");
    }

    if (secure) {
        parts.push("Secure");
    }

    if (clear) {
        parts.push("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    }

    return parts.join("; ");
}

function setSessionCookie(res, token) {
    addCookie(
        res,
        serializeCookie(
            SESSION_COOKIE,
            token,
            {
                maxAge: SESSION_TTL_SECONDS
            }
        )
    );
}

function setDeviceCookie(res, token) {
    addCookie(
        res,
        serializeCookie(
            DEVICE_COOKIE,
            token,
            {
                maxAge: DEVICE_TTL_SECONDS
            }
        )
    );
}

function clearSessionCookie(res) {
    addCookie(
        res,
        serializeCookie(
            SESSION_COOKIE,
            "",
            {
                maxAge: 0,
                clear: true
            }
        )
    );
}

function getAuthenticatedSession(req) {
    const cookies = parseCookies(req.headers.cookie);

    const sessionToken = cookies[SESSION_COOKIE];

    if (
        typeof sessionToken !== "string" ||
        sessionToken.length < 20 ||
        sessionToken.length > 100
    ) {
        return null;
    }

    const sessionHash = hashToken(sessionToken);

    const session = db.prepare(`
        SELECT
            sessions.id AS session_id,
            sessions.account_id,
            sessions.expires_at,
            accounts.email,
            accounts.role,
            accounts.status
        FROM sessions
        INNER JOIN accounts
            ON accounts.id = sessions.account_id
        WHERE sessions.session_hash = ?
          AND sessions.revoked_at = ''
        LIMIT 1
    `).get(sessionHash);

    if (!session) {
        return null;
    }

    const expiresAt = Date.parse(session.expires_at);

    if (
        !Number.isFinite(expiresAt) ||
        expiresAt <= Date.now()
    ) {
        return null;
    }

    if (session.status !== "active") {
        return null;
    }

    return {
        id: session.session_id,
        account: {
            id: session.account_id,
            email: session.email,
            role: session.role
        },
        expiresAt: session.expires_at
    };
}

function isProtectedPage(pathname) {
    if (
        pathname === "/" ||
        pathname === "/index.html" ||
        pathname === "/profile" ||
        pathname === "/profile/" ||
        pathname === "/profile/index.html"
    ) {
        return true;
    }

    return /^\/games\/[^/]+\.html$/i.test(pathname);
}

function requireApiAuth(req, res, next) {
    const session = getAuthenticatedSession(req);

    if (!session) {
        res.status(401).json({
            ok: false,
            error: "AUTHENTICATION_REQUIRED"
        });
        return;
    }

    req.auth = session;

    next();
}

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

app.get("/api/auth/session", (req, res) => {
    res.setHeader("Cache-Control", "no-store");

    const session = getAuthenticatedSession(req);

    if (!session) {
        res.json({
            authenticated: false
        });
        return;
    }

    res.json({
        authenticated: true,
        account: session.account,
        expiresAt: session.expiresAt
    });
});

app.post("/api/auth/login", (req, res) => {
    const email = String(
        req.body?.email || ""
    ).trim().toLowerCase();

    const password = String(
        req.body?.password || ""
    );

    if (!email || !password) {
        res.status(400).json({
            ok: false,
            error: "INVALID_REQUEST"
        });
        return;
    }

    const account = db.prepare(`
        SELECT
            id,
            email,
            password_hash,
            role,
            status
        FROM accounts
        WHERE email = ?
        LIMIT 1
    `).get(email);

    if (!account) {
        res.status(401).json({
            ok: false,
            error: "INVALID_CREDENTIALS"
        });
        return;
    }

    let passwordValid = false;

    try {
        passwordValid = verifyPassword(
            password,
            account.password_hash
        );
    } catch {
        passwordValid = false;
    }

    if (!passwordValid) {
        res.status(401).json({
            ok: false,
            error: "INVALID_CREDENTIALS"
        });
        return;
    }

    if (account.status !== "active") {
        res.status(403).json({
            ok: false,
            error: "ACCOUNT_SUSPENDED"
        });
        return;
    }

    const cookies = parseCookies(req.headers.cookie);

    let deviceToken = cookies[DEVICE_COOKIE] || "";

    if (
        deviceToken.length < 20 ||
        deviceToken.length > 100
    ) {
        deviceToken = "";
    }

    if (account.role === "PLAYER") {
        if (!deviceToken) {
            deviceToken = createToken(32);
        }

        const deviceHash = hashToken(deviceToken);

        const device = db.prepare(`
            SELECT
                id,
                account_id,
                status
            FROM devices
            WHERE device_key_hash = ?
            LIMIT 1
        `).get(deviceHash);

        if (device?.status === "revoked") {
            res.status(403).json({
                ok: false,
                error: "DEVICE_REVOKED"
            });
            return;
        }

        if (
            device &&
            device.account_id !== account.id
        ) {
            res.status(409).json({
                ok: false,
                error: "DEVICE_BOUND"
            });
            return;
        }

        const now = new Date().toISOString();

        if (device) {
            db.prepare(`
                UPDATE devices
                SET last_seen_at = ?
                WHERE id = ?
            `).run(
                now,
                device.id
            );
        } else {
            db.prepare(`
                INSERT INTO devices (
                    device_key_hash,
                    account_id,
                    status,
                    created_at,
                    last_seen_at
                )
                VALUES (?, ?, 'active', ?, ?)
            `).run(
                deviceHash,
                account.id,
                now,
                now
            );
        }

        setDeviceCookie(
            res,
            deviceToken
        );
    }

    const now = new Date();

    const createdAt = now.toISOString();

    const expiresAt = new Date(
        now.getTime() + SESSION_TTL_MS
    ).toISOString();

    db.prepare(`
        DELETE FROM sessions
        WHERE expires_at <= ?
           OR revoked_at <> ''
    `).run(createdAt);

    const sessionToken = createToken(32);

    const sessionHash = hashToken(sessionToken);

    db.prepare(`
        INSERT INTO sessions (
            account_id,
            session_hash,
            created_at,
            expires_at,
            revoked_at
        )
        VALUES (?, ?, ?, ?, '')
    `).run(
        account.id,
        sessionHash,
        createdAt,
        expiresAt
    );

    setSessionCookie(
        res,
        sessionToken
    );

    res.json({
        ok: true,
        account: {
            id: account.id,
            email: account.email,
            role: account.role
        },
        expiresAt
    });
});

app.post(
    "/api/auth/logout",
    requireApiAuth,
    (req, res) => {
        const cookies = parseCookies(req.headers.cookie);

        const sessionToken = cookies[SESSION_COOKIE];

        if (sessionToken) {
            const sessionHash = hashToken(
                sessionToken
            );

            db.prepare(`
                UPDATE sessions
                SET revoked_at = ?
                WHERE session_hash = ?
            `).run(
                new Date().toISOString(),
                sessionHash
            );
        }

        clearSessionCookie(res);

        res.json({
            ok: true
        });
    }
);

const SCORE_GAMES = new Set(["snake", "flappy", "memory"]);
const MAX_SCORE = 1000000;

app.post("/api/scores", requireApiAuth, (req, res) => {
    const gameKey = String(req.body?.gameKey || "").trim().toLowerCase();
    const score = req.body?.score;

    if (!SCORE_GAMES.has(gameKey)) {
        res.status(400).json({
            ok: false,
            error: "INVALID_GAME"
        });
        return;
    }

    if (
        typeof score !== "number" ||
        !Number.isSafeInteger(score) ||
        score < 0 ||
        score > MAX_SCORE
    ) {
        res.status(400).json({
            ok: false,
            error: "INVALID_SCORE"
        });
        return;
    }

    const achievedAt = new Date().toISOString();
    const accountId = req.auth.account.id;

    const result = db.prepare(`
        INSERT INTO game_scores (
            account_id,
            game_key,
            score,
            achieved_at
        )
        VALUES (?, ?, ?, ?)
    `).run(accountId, gameKey, score, achievedAt);

    res.status(201).json({
        ok: true,
        score: {
            id: Number(result.lastInsertRowid),
            gameKey,
            score,
            achievedAt
        }
    });
});
app.use((req, res, next) => {
    if (!isProtectedPage(req.path)) {
        next();
        return;
    }

    const session = getAuthenticatedSession(req);

    if (!session) {
        res.redirect(
            302,
            "/auth/login.html"
        );
        return;
    }

    res.setHeader(
        "Cache-Control",
        "no-store"
    );

    req.auth = session;

    next();
});

app.use(express.static(ROOT_DIR));

app.use((req, res) => {
    res.status(404).json({
        error: "NOT_FOUND"
    });
});

const server = app.listen(
    PORT,
    "127.0.0.1",
    () => {
        console.log(
            `Zero Arcade server running at http://127.0.0.1:${PORT}`
        );
    }
);

function shutdown() {
    server.close(() => {
        db.close();
        process.exit(0);
    });
}

process.on("SIGINT", shutdown);

process.on("SIGTERM", shutdown);