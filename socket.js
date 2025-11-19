// /socket.js
const { Server } = require("socket.io");

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // roomId → { sender: socketId, receiver: socketId }
  const rooms = {};

  io.on("connection", (socket) => {
    console.log("Device connected:", socket.id);
    socket.activeRoom = null;
    socket.role = null;

    // JOIN ROOM
    socket.on("join-room", ({ roomId, role }) => {
      if (!roomId || !role) {
        socket.emit("error-message", "Invalid join parameters");
        return;
      }

      // Create room entry if not exist
      if (!rooms[roomId]) {
        rooms[roomId] = { sender: null, receiver: null };
      }

      const room = rooms[roomId];

      // role check
      if (role === "sender") {
        if (room.sender) {
          socket.emit("error-message", "Sender already present in room.");
          return;
        }
        room.sender = socket.id;
      }

      if (role === "receiver") {
        if (room.receiver) {
          socket.emit("error-message", "Receiver already present in room.");
          return;
        }
        room.receiver = socket.id;
      }

      socket.join(roomId);
      socket.activeRoom = roomId;
      socket.role = role;

      console.log(`User ${socket.id} joined room ${roomId} as ${role}`);

      // pairing logic
      if (room.sender && room.receiver) {
        io.to(roomId).emit("room-status", {
          status: "connected",
          message: "Paired successfully. Start transfer."
        });
      } else {
        socket.emit("room-status", {
          status: "waiting",
          message: "Waiting for the other device..."
        });
      }
    });

    // META
    socket.on("file-meta", ({ roomId, filename, totalSize, totalChunks }) => {
      socket.to(roomId).emit("file-meta", { filename, totalSize, totalChunks });
    });

    // CHUNK
    socket.on("file-chunk", ({ roomId, seq, chunk, size, totalChunks }) => {
      socket.to(roomId).emit("file-chunk", { seq, chunk, size, totalChunks });
    });

    // COMPLETE
    socket.on("file-complete", ({ roomId, filename, totalChunks }) => {
      socket.to(roomId).emit("file-complete", { filename, totalChunks });
    });

    // RESEND REQUEST
    socket.on("resend-request", ({ roomId, seq }) => {
      socket.to(roomId).emit("resend-request", { seq });
    });

    // ERROR
    socket.on("send-error", ({ roomId, message }) => {
      io.to(roomId).emit("error-message", message || "Transfer error");
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      console.log("Device disconnected:", socket.id);

      const roomId = socket.activeRoom;
      if (!roomId || !rooms[roomId]) return;

      const room = rooms[roomId];

      if (room.sender === socket.id) room.sender = null;
      if (room.receiver === socket.id) room.receiver = null;

      socket.to(roomId).emit("error-message", "Peer disconnected. Transfer aborted.");

      if (!room.sender && !room.receiver) {
        delete rooms[roomId];
      }
    });
  });

  return io;
}

module.exports = { setupSocket };
