// The standalone WebSocket server URL (e.g. for Vercel/serverless environments)
// For local development, it defaults to localhost:5001
const WS_SERVER_URL = process.env.WS_SERVER_URL || "http://localhost:5001";
const INTERNAL_SECRET = process.env.INTERNAL_WS_SECRET || "default_internal_ws_secret_123";

let ioInstance = null;

export const initSocket = (io) => {
  ioInstance = io;
};

/**
 * A mock Socket.IO interface that forwards emits to the standalone WS server
 */
class SocketBridge {
  constructor(room = null) {
    this.room = room;
  }

  to(room) {
    return new SocketBridge(room);
  }

  emit(event, data) {
    if (ioInstance) {
      if (this.room) {
        ioInstance.to(this.room).emit(event, data);
      } else {
        ioInstance.emit(event, data);
      }
      return;
    }

    // Fire and forget, we don't wait for the WebSocket server to respond
    fetch(`${WS_SERVER_URL}/internal/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INTERNAL_SECRET}`,
      },
      body: JSON.stringify({
        room: this.room,
        event,
        data,
      }),
    }).catch((err) => {
      console.error("[SocketBridge] Failed to emit event to WS server:", err.message);
    });
  }
}

const ioBridge = new SocketBridge();

export const getIO = () => {
  if (ioInstance) {
    return ioInstance;
  }
  return ioBridge;
};

