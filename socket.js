const { Server } = require("socket.io");

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("A device connected:", socket.id);

    // sender creates room
    socket.on("join-room", ({ roomId, role }) => {
      if (!roomId) {
        socket.emit("error-message", "Invalid Room ID");
        return;
      }

      socket.join(roomId);

      const clients = io.sockets.adapter.rooms.get(roomId);

      // First person in room → sender usually
      if (clients.size === 1 && role === "sender") {
        socket.emit("room-status", {
          status: "waiting",
          message: "Waiting for receiver..."
        });
      }

      // Second person joined
      if (clients.size === 2) {
        io.to(roomId).emit("room-status", {
          status: "connected",
          message: "Paired successfully. Start transfer."
        });
      }

      // More than 2 should not join
      if (clients.size > 2) {
        socket.leave(roomId);
        socket.emit("error-message", "Room full. Only 2 devices allowed.");
      }
    });

    // ---- File chunk transfer ----
    socket.on("file-chunk", ({ roomId, chunk, current, total }) => {
      socket.to(roomId).emit("file-chunk", { chunk, current, total });
    });

    // ---- File transfer complete ----
    socket.on("file-complete", ({ roomId, filename }) => {
      socket.to(roomId).emit("file-complete", { filename });
    });

    // ---- Error handling ----
    socket.on("send-error", ({ roomId, message }) => {
      io.to(roomId).emit("error-message", message);
    });

    // ---- If someone disconnects ----
    socket.on("disconnect", () => {
      console.log("Device disconnected:", socket.id);

      // socket.rooms contains all rooms, including its own ID
      const rooms = [...socket.rooms].filter(r => r !== socket.id);

      rooms.forEach(roomId => {
        socket.to(roomId).emit("error-message", "Peer disconnected. Transfer aborted.");
      });
    });

  });

  return io;
}

module.exports = { setupSocket };
