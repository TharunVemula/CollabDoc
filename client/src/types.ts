export interface User {
  id: string;
  name: string;
  color: string;
}

export interface RemoteCursor {
  clientId: string;
  name: string;
  color: string;
  cursor: number;
  selectionStart: number;
  selectionEnd: number;
}

export type ServerMessage =
  | { type: "sync"; content: string; version: number; users: User[] }
  | { type: "presence"; users: User[] }
  | {
      type: "insert";
      clientId: string;
      pos: number;
      text: string;
      version: number;
    }
  | {
      type: "delete";
      clientId: string;
      pos: number;
      length: number;
      version: number;
    }
  | {
      type: "cursor";
      clientId: string;
      name: string;
      color: string;
      cursor: number;
      selectionStart: number;
      selectionEnd: number;
    };

export type ClientMessage =
  | { type: "insert"; pos: number; text: string }
  | { type: "delete"; pos: number; length: number }
  | {
      type: "cursor";
      cursor: number;
      selectionStart: number;
      selectionEnd: number;
    };
