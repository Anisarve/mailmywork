// socket.js
const { Server } = require("socket.io");

function setupSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  io.on("connection", (socket) => {
    console.log("Device connected:", socket.id);

    socket.activeRoom = null;

    // User joins a room
    socket.on("join-room", ({ roomId }) => {
      if (!roomId) return socket.emit("error-message", "Invalid room");

      socket.join(roomId);
      socket.activeRoom = roomId;

      const clients = io.sockets.adapter.rooms.get(roomId) || new Set();

      if (clients.size === 1) {
        io.to(roomId).emit("room-status", "waiting");
      } else if (clients.size === 2) {
        io.to(roomId).emit("room-status", "connected");
      } else {
        socket.leave(roomId);
        socket.emit("error-message", "Room full (2 max)");
      }
    });

    // -----------------------------------------------------
    //                 WebRTC Signaling
    // -----------------------------------------------------
    socket.on("webrtc-offer", (roomId, data) => {
      socket.to(roomId).emit("webrtc-offer", data);
    });

    socket.on("webrtc-answer", (roomId, data) => {
      socket.to(roomId).emit("webrtc-answer", data);
    });

    socket.on("webrtc-ice-candidate", (roomId, data) => {
      socket.to(roomId).emit("webrtc-ice-candidate", data);
    });

    // -----------------------------------------------------
    //                  Fallback Relay Mode
    // -----------------------------------------------------

    socket.on("fallback-ready", (roomId) => {
      socket.to(roomId).emit("fallback-ready");
    });

    socket.on("fallback-meta", (roomId, meta) => {
      socket.to(roomId).emit("fallback-meta", meta);
    });

    socket.on("fallback-chunk", (roomId, payload) => {
      socket.to(roomId).emit("fallback-chunk", payload);
    });

    socket.on("fallback-complete", (roomId, payload) => {
      socket.to(roomId).emit("fallback-complete", payload);
    });

    socket.on("fallback-resend", (roomId, seq) => {
      socket.to(roomId).emit("fallback-resend", seq);
    });

    // -----------------------------------------------------
    //                   Clean Disconnect
    // -----------------------------------------------------
    socket.on("disconnect", () => {
      console.log("Device disconnected:", socket.id);
      if (socket.activeRoom)
        socket.to(socket.activeRoom).emit("peer-disconnected");
    });
  });

  return io;
}

module.exports = { setupSocket };
