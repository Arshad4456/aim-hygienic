function validatePassword(password) {
  if (typeof password !== "string") return { ok: false, message: "Password is required" };
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters long" };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: "Password must include at least one capital letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, message: "Password must include at least one number" };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, message: "Password must include at least one symbol" };
  }
  return { ok: true };
}

module.exports = { validatePassword };