const crypto = require("node:crypto");

const PASSWORD_PREFIX = "scrypt";

function createToken(byteLength = 32) {
    return crypto.randomBytes(byteLength).toString("base64url");
}

function hashToken(token) {
    return crypto
        .createHash("sha256")
        .update(token, "utf8")
        .digest("base64url");
}

function hashPassword(password) {
    if (typeof password !== "string" || !password.length) {
        throw new Error("INVALID_PASSWORD");
    }

    const salt = crypto.randomBytes(16).toString("base64url");

    const derivedKey = crypto.scryptSync(
        password,
        salt,
        64,
        {
            N: 16384,
            r: 8,
            p: 1,
            maxmem: 64 * 1024 * 1024
        }
    );

    return `${PASSWORD_PREFIX}$${salt}$${derivedKey.toString("base64url")}`;
}

function verifyPassword(password, storedHash) {
    if (
        typeof password !== "string" ||
        typeof storedHash !== "string"
    ) {
        return false;
    }

    const parts = storedHash.split("$");

    if (parts.length !== 3 || parts[0] !== PASSWORD_PREFIX) {
        return false;
    }

    const salt = parts[1];
    const storedKey = Buffer.from(parts[2], "base64url");

    if (!salt || storedKey.length !== 64) {
        return false;
    }

    const derivedKey = crypto.scryptSync(
        password,
        salt,
        64,
        {
            N: 16384,
            r: 8,
            p: 1,
            maxmem: 64 * 1024 * 1024
        }
    );

    if (derivedKey.length !== storedKey.length) {
        return false;
    }

    return crypto.timingSafeEqual(
        derivedKey,
        storedKey
    );
}

module.exports = {
    createToken,
    hashToken,
    hashPassword,
    verifyPassword
};