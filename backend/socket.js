// socket.js  —  place in project ROOT (same level as server.js)

let _io = null;

function initSocket(httpServer) {
  const { Server } = require("socket.io");

  _io = new Server(httpServer, {
    cors: {
      origin: "*", // lock this down in production
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  _io.on("connection", (socket) => {
    // ── USER joins their personal room ──────────────────────────
    socket.on("join", ({ userId }) => {
      if (!userId) return;
      const room = `user_${userId}`;
      socket.join(room);
    });

    // ── ADMIN joins the shared admin room ────────────────────────
    socket.on("join_admin", () => {
      socket.join("admin_room");
    });
  });

  return _io;
}

function getIO() {
  if (!_io) {
    throw new Error(
      "Socket.io not initialised — call initSocket(server) first in server.js",
    );
  }
  return _io;
}

module.exports = { initSocket, getIO };
