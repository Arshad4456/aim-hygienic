const crypto = require("crypto");

const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keylen: 64,
};

function scryptAsync(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_PARAMS.keylen, SCRYPT_PARAMS, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key);
    });
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt);
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt}$${derived.toString("hex")}`;
}

async function verifyPassword(password, passwordHash) {
  const raw = String(passwordHash || "");
  const parts = raw.split("$");

  if (parts[0] !== "scrypt" || parts.length !== 6) {
    // Backward-compatible fallback for legacy/dev records.
    return password === raw;
  }

  const [, n, r, p, salt, storedHex] = parts;
  const keylen = Buffer.from(storedHex, "hex").length;
  const derived = await new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      keylen,
      { N: Number(n), r: Number(r), p: Number(p) },
      (error, key) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(key);
      },
    );
  });

  const stored = Buffer.from(storedHex, "hex");
  if (stored.length !== derived.length) return false;
  return crypto.timingSafeEqual(stored, derived);
}

module.exports = { hashPassword, verifyPassword };