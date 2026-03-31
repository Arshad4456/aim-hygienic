function resolveSocketServerCtor() {
  try {
    return require("socket.io").Server;
  } catch (_error) {
    return null;
  }
}

function createSocketServer(httpServer) {
  const SocketServer = resolveSocketServerCtor();
  if (!SocketServer) return null;

  return new SocketServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",").map((value) => value.trim())
        : ["https://aimhygienics.com", "https://www.aimhygienics.com", "http://localhost:3000"],
      credentials: true,
    },
  });
}

module.exports = { createSocketServer };
