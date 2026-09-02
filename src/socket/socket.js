// The new standalone WebSocket server URL (e.g. on Railway/Render)
// For local development, it defaults to localhost:5001
const WS_SERVER_URL = process.env.WS_SERVER_URL || "http://localhost:5001";
const INTERNAL_SECRET = process.env.INTERNAL_WS_SECRET || "default_internal_ws_secret_123";

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
    // Fire and forget, we don't wait for the WebSocket server to respond
    // to avoid slowing down the REST API
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

// No longer needed since we don't attach to the Express server, 
// but kept so we don't break old imports if any exist.
export const initSocket = () => {};

export const getIO = () => {
  return ioBridge;
};
