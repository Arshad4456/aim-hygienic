const { getAllowedOrigins } = require("../config/cors");
function resolveSocketServerCtor() { try { return require("socket.io").Server; } catch (_error) { return null; } }
function createSocketServer(httpServer) { const SocketServer = resolveSocketServerCtor(); if (!SocketServer) return null; return new SocketServer(httpServer, { cors: { origin: getAllowedOrigins(), credentials: true } }); }
module.exports = { createSocketServer };
