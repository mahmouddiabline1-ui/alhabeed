import { io, type Socket } from "socket.io-client";
import { serverUrl } from "../../serverUrl";

let socket: Socket | null = null;

export function getAlHabeedSocket(): Socket {
  socket ??= io(serverUrl || undefined, { autoConnect: false });
  return socket;
}
