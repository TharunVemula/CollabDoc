import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, RemoteCursor, ServerMessage, User } from "./types";
import { applyRemoteDelete, applyRemoteInsert, computeOps } from "./diff";

const COLORS = [
  "#e57373",
  "#f06292",
  "#ba68c8",
  "#9575cd",
  "#7986cb",
  "#64b5f6",
  "#4dd0e1",
  "#4db6ac",
  "#81c784",
  "#aed581",
  "#ffb74d",
  "#ff8a65",
];

function wsUrl(room: string, name: string, color: string) {
  const rawPath = import.meta.env.VITE_BACKEND_URL?.trim() || "/ws";
  const isAbsolute =
    rawPath.startsWith("ws:") ||
    rawPath.startsWith("wss:") ||
    rawPath.startsWith("http:") ||
    rawPath.startsWith("https:");
  const params = new URLSearchParams({ room, name, color });

  if (isAbsolute) {
    const url = rawPath.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
    return `${url}?${params}`;
  }

  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${proto}//${host}${rawPath}?${params}`;
}

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function useCollaboration(room: string, displayName: string) {
  const [content, setContent] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<
    Record<string, RemoteCursor>
  >({});
  const [connected, setConnected] = useState(false);
  const [clientId, setClientId] = useState("");
  const colorRef = useRef(randomColor());
  const wsRef = useRef<WebSocket | null>(null);
  const contentRef = useRef("");
  const applyingRemote = useRef(false);
  const onContentChangeRef = useRef<
    (content: string, cursor: number, selStart: number, selEnd: number) => void
  >(() => {});

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    let closed = false;
    const color = colorRef.current;
    const ws = new WebSocket(wsUrl(room, displayName, color));
    wsRef.current = ws;

    ws.onopen = () => {
      if (!closed) setConnected(true);
    };
    ws.onclose = () => {
      if (!closed) setConnected(false);
    };
    ws.onerror = () => {
      if (!closed) setConnected(false);
    };

    ws.onmessage = (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data) as ServerMessage;
      } catch {
        return;
      }

      switch (msg.type) {
        case "sync":
          applyingRemote.current = true;
          contentRef.current = msg.content;
          setContent(msg.content);
          setUsers(msg.users);
          applyingRemote.current = false;
          onContentChangeRef.current(msg.content, 0, 0, 0);
          break;

        case "presence":
          setUsers(msg.users);
          setRemoteCursors((prev) => {
            const activeIds = new Set(msg.users.map((user) => user.id));
            return Object.fromEntries(
              Object.entries(prev).filter(([clientId]) =>
                activeIds.has(clientId),
              ),
            );
          });
          break;

        case "insert": {
          applyingRemote.current = true;
          const next = applyRemoteInsert(
            contentRef.current,
            msg.pos,
            msg.text,
            0,
            0,
            0,
          );
          contentRef.current = next.content;
          setContent(next.content);
          applyingRemote.current = false;
          onContentChangeRef.current(next.content, -1, -1, -1);
          break;
        }

        case "delete": {
          applyingRemote.current = true;
          const next = applyRemoteDelete(
            contentRef.current,
            msg.pos,
            msg.length,
            0,
            0,
            0,
          );
          contentRef.current = next.content;
          setContent(next.content);
          applyingRemote.current = false;
          onContentChangeRef.current(next.content, -1, -1, -1);
          break;
        }

        case "cursor":
          setRemoteCursors((prev) => ({
            ...prev,
            [msg.clientId]: {
              clientId: msg.clientId,
              name: msg.name,
              color: msg.color,
              cursor: msg.cursor,
              selectionStart: msg.selectionStart,
              selectionEnd: msg.selectionEnd,
            },
          }));
          break;
      }
    };

    return () => {
      closed = true;
      ws.close();
    };
  }, [room, displayName]);

  const registerEditorCallback = useCallback(
    (
      fn: (
        content: string,
        cursor: number,
        selStart: number,
        selEnd: number,
      ) => void,
    ) => {
      onContentChangeRef.current = fn;
    },
    [],
  );

  const handleLocalChange = useCallback(
    (newText: string, cursor: number, selStart: number, selEnd: number) => {
      if (applyingRemote.current) return;

      const oldText = contentRef.current;
      if (oldText === newText) return;

      const ops = computeOps(oldText, newText);
      contentRef.current = newText;
      setContent(newText);

      for (const op of ops) {
        send(op);
      }

      send({
        type: "cursor",
        cursor,
        selectionStart: selStart,
        selectionEnd: selEnd,
      });
    },
    [send],
  );

  const handleSelectionChange = useCallback(
    (cursor: number, selStart: number, selEnd: number) => {
      send({
        type: "cursor",
        cursor,
        selectionStart: selStart,
        selectionEnd: selEnd,
      });
    },
    [send],
  );

  const userColor = colorRef.current;

  return {
    content,
    users,
    remoteCursors,
    connected,
    clientId,
    setClientId,
    userColor,
    handleLocalChange,
    handleSelectionChange,
    registerEditorCallback,
  };
}
