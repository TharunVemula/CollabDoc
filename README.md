# CollabDoc — Real-time collaborative editor

A Google Docs–style live document editor built with **React**, **Go**, and **WebSockets**. Multiple users can join the same room and edit text together with live cursors and presence.

## Architecture

```
Browser (React)  ←→  WebSocket  ←→  Go server (rooms + document state)
```

- Each **room** has one shared document on the server.
- Edits are sent as **insert** / **delete** operations at character positions.
- The server applies ops, updates authoritative content, and broadcasts to other clients.
- **Cursor** and **presence** updates are broadcast separately.

## Quick start

### 1. Backend (Go)

```bash
cd backend
go mod tidy
go run .
```

Server listens on `http://localhost:8080` (WebSocket at `/ws`). If port 8080 is busy, use `$env:PORT="8081"; go run .` on Windows and set `VITE_BACKEND_PORT=8081` in `frontend/.env.development`, then restart `npm run dev`.

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 3. Try multi-user editing

1. Open the app in two browser windows (or normal + incognito).
2. Use the **same room ID** and different names.
3. Type in one window — changes appear in the other within milliseconds.

Share a link with `?room=my-project` so others join the same document.

## API (WebSocket messages)

**Client → server**

| type     | fields                                      |
|----------|---------------------------------------------|
| `insert` | `pos`, `text`                               |
| `delete` | `pos`, `length`                             |
| `cursor` | `cursor`, `selectionStart`, `selectionEnd`  |

**Server → client**

| type       | description                          |
|------------|--------------------------------------|
| `sync`     | Full document + user list on join    |
| `presence` | Updated online users                 |
| `insert`   | Remote insert (includes `clientId`)  |
| `delete`   | Remote delete                        |
| `cursor`   | Remote caret position                |

Query params on connect: `room`, `name`, `color`.

## Project structure

```
multi-user/
├── backend/          # Go WebSocket hub
│   ├── main.go
│   ├── hub.go
│   ├── client.go
│   └── document.go
└── frontend/         # React + Vite
    └── src/
        ├── App.tsx
        ├── CollaborativeEditor.tsx
        ├── useCollaboration.ts
        └── diff.ts
```

## Production notes

- Set `PORT` for the Go server; serve the Vite build as static files or behind a reverse proxy that upgrades WebSockets.
- Tighten `CheckOrigin` in `main.go` for your domain.
- For very large documents or heavy concurrency, consider CRDTs (e.g. Yjs) or operational transformation libraries
