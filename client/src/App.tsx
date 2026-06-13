import { useMemo, useState } from "react";
import CollaborativeEditor from "./CollaborativeEditor";
import { useCollaboration } from "./useCollaboration";
import "./App.css";

function roomFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("room") || "default";
}

export default function App() {
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem("collab-name") || "");
  const [room, setRoom] = useState(roomFromUrl);

  const displayName = name.trim() || "Anonymous";

  const shareLink = useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("room", room);
    return url.toString();
  }, [room]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("collab-name", name.trim());
    const url = new URL(window.location.href);
    url.searchParams.set("room", room);
    window.history.replaceState({}, "", url);
    setJoined(true);
  };

  if (!joined) {
    return (
      <div className="app join-screen">
        <div className="join-card">
          <h1>CollabDoc</h1>
          <p className="tagline">Real-time collaborative documents</p>
          <form onSubmit={handleJoin}>
            <label>
              Your name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex"
                maxLength={32}
                autoFocus
              />
            </label>
            <label>
              Room ID
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="default"
                maxLength={64}
              />
            </label>
            <button type="submit" className="btn-primary">
              Join document
            </button>
          </form>
          <p className="hint">
            Share the same room ID with others to edit together live.
          </p>
        </div>
      </div>
    );
  }

  return (
    <EditorWorkspace
      room={room}
      displayName={displayName}
      shareLink={shareLink}
    />
  );
}

function EditorWorkspace({
  room,
  displayName,
  shareLink,
}: {
  room: string;
  displayName: string;
  shareLink: string;
}) {
  const collab = useCollaboration(room, displayName);

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>CollabDoc</h1>
          <span className={`status ${collab.connected ? "online" : "offline"}`}>
            {collab.connected ? "Live" : "Reconnecting…"}
          </span>
        </div>
        <div className="header-center">
          <span className="room-label">Room:</span>
          <code className="room-id">{room}</code>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigator.clipboard.writeText(shareLink)}
          >
            Copy link
          </button>
        </div>
        <div className="header-right">
          <ul className="avatars">
            {collab.users.map((u) => (
              <li
                key={u.id}
                title={u.name}
                style={{ backgroundColor: u.color }}
              >
                {u.name.charAt(0).toUpperCase()}
              </li>
            ))}
          </ul>
          <span className="user-count">
            {collab.users.length} online
          </span>
        </div>
      </header>

      <main className="main">
        <CollaborativeEditor
          content={collab.content}
          remoteCursors={collab.remoteCursors}
          myColor={collab.userColor}
          onChange={collab.handleLocalChange}
          onSelectionChange={collab.handleSelectionChange}
          registerCallback={collab.registerEditorCallback}
        />
      </main>
    </div>
  );
}
