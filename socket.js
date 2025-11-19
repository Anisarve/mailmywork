// /socket.js
const { Server } = require("socket.io");

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Device connected:", socket.id);

    // Track last joined room
    socket.activeRoom = null;

    // User joins room
    socket.on("join-room", ({ roomId, role }) => {
      if (!roomId) {
        socket.emit("error-message", "Invalid Room ID");
        return;
      }

      socket.join(roomId);
      socket.activeRoom = roomId;

      const clients = io.sockets.adapter.rooms.get(roomId);

      if (!clients) return;

      // First device (usually sender)
      if (clients.size === 1 && role === "sender") {
        socket.emit("room-status", {
          status: "waiting",
          message: "Waiting for receiver..."
        });
        console.log(`Room ${roomId} created by sender ${socket.id}`);
      }

      // Second device joins → pairing success
      if (clients.size === 2) {
        io.to(roomId).emit("room-status", {
          status: "connected",
          message: "Paired successfully. Start transfer."
        });
        console.log(`Room ${roomId} paired successfully.`);
      }

      // More than 2 clients not allowed
      if (clients.size > 2) {
        socket.leave(roomId);
        socket.activeRoom = null;
        socket.emit("error-message", "Room full. Only 2 devices allowed.");
      }
    });

    // Receive file metadata
    socket.on("file-meta", ({ roomId, filename, totalSize, totalChunks }) => {
      socket.to(roomId).emit("file-meta", { filename, totalSize, totalChunks });
    });

    // Receive file chunk (with seq)
    socket.on("file-chunk", ({ roomId, seq, chunk, size, totalChunks }) => {
      socket.to(roomId).emit("file-chunk", { seq, chunk, size, totalChunks });
    });

    // Sender signals file complete
    socket.on("file-complete", ({ roomId, filename, totalChunks }) => {
      socket.to(roomId).emit("file-complete", { filename, totalChunks });
    });

    // Receiver requests resend of a missing chunk
    socket.on("resend-request", ({ roomId, seq }) => {
      console.log(`Receiver requested resend for chunk seq=${seq} in room=${roomId}`);
      socket.to(roomId).emit("resend-request", { seq });
    });

    // Custom errors (sender → receiver or receiver → sender)
    socket.on("send-error", ({ roomId, message }) => {
      io.to(roomId).emit("error-message", message || "Transfer error");
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("Device disconnected:", socket.id);

      const roomId = socket.activeRoom;
      if (roomId) {
        socket.to(roomId).emit("error-message", "Peer disconnected. Transfer aborted.");
      }
    });

  });
  return io;
}

module.exports = { setupSocket };
