import { io, Socket } from "socket.io-client";

// Auto-detect environment for better configuration
const isDevelopment = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (isDevelopment ? "http://localhost:8000" : window.location.origin);

// Event types
export interface ProgressStep {
  name: string;
  progress: number;
}

export interface JobResult {
  analysis?: {
    totalFiles: number;
    csharpFiles: number;
    linesOfCode: number;
    fileSize: string;
  };
  conversion?: {
    totalConverted: number;
    totalFiles: number;
    successRate: number;
  };
  zipFilename?: string;
}

export interface ProgressUpdateEvent {
  jobId: string;
  timestamp: string;
  status: "pending" | "completed" | "failed";
  progress: number;
  currentStep: string;
  steps: ProgressStep[];
  result?: JobResult;
  error?: string | null;
  filesConverted?: number;
  totalFiles?: number;
  elapsedTime?: number;
  estimatedTime?: number;
}

export interface SystemNotification {
  message: string;
  type: "info" | "warning" | "error";
}

// Socket instance
let socket: Socket | null = null;

export const connectSocket = (jobId?: string): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("✅ Connected to WebSocket:", socket?.id);
      if (jobId) {
        socket?.emit("join-job", jobId);
        console.log(`📦 Joined room: ${jobId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from WebSocket server");
    });

    // Handle connection errors
    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });
  } else if (jobId) {
    // If socket already exists, join the job room
    socket.emit("join-job", jobId);
    console.log(`📦 Joined existing socket to room: ${jobId}`);
  }
  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (jobId?: string) => {
  if (socket) {
    if (jobId) {
      socket.emit("job-completed", jobId);
      socket.emit("leave-job", jobId);
      console.log(`🚪 Left room: ${jobId}`);
    }
    socket.disconnect();
    socket = null;
  }
};