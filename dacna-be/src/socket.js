import { Server } from "socket.io";
let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // Client joins a session room
    socket.on("join_session", (sessionId) => {
      if (sessionId) {
        socket.join(`session_${sessionId}`);
      }
    });

    socket.on("disconnect", () => {
      // No action yet
    });
  });

  return io;
}

export function getIO() {
  return io;
}
