const crypto = require("crypto");

let bcrypt = null;
try {
  bcrypt = require("bcryptjs");
} catch (_) {
  // bcryptjs not installed - bcrypt verification will be unavailable
}

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

function scryptAsync(password, salt, keylen, params) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, params, (error, key) => {
      if (error) return reject(error);
      resolve(key);
    });
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, SCRYPT_PARAMS.keylen, SCRYPT_PARAMS);
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt}$${derived.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const provided = String(password ?? "");
  const raw = String(stored ?? "").trim();
  if (!raw) return false;

  // 1) scrypt format
  if (raw.startsWith("scrypt$")) {
    const parts = raw.split("$");
    if (parts.length !== 6) return false;

    const [, n, r, p, salt, storedHex] = parts;
    const storedBuf = Buffer.from(storedHex, "hex");
    const derived = await scryptAsync(provided, salt, storedBuf.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });

    if (storedBuf.length !== derived.length) return false;
    return crypto.timingSafeEqual(storedBuf, derived);
  }

  // 2) bcrypt format
  if (raw.startsWith("$2a$") || raw.startsWith("$2b$") || raw.startsWith("$2y$")) {
    if (!bcrypt) return false;
    return bcrypt.compare(provided, raw);
  }

  // 3) legacy plain text
  return provided === raw;
}

module.exports = { hashPassword, verifyPassword };
