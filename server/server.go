package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func newServer(cfg Config, hub *Hub) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handleWebSocket(cfg, hub))
	mux.HandleFunc("/health", handleHealth)

	if cfg.StaticDir != "" {
		fs := http.FileServer(http.Dir(cfg.StaticDir))
		mux.Handle("/", fs)
	}

	return mux
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func handleWebSocket(cfg Config, hub *Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !isOriginAllowed(r, cfg.AllowedOrigins) {
			http.Error(w, "origin not allowed", http.StatusForbidden)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("websocket upgrade failed: %v", err)
			return
		}

		roomID := r.URL.Query().Get("room")
		if roomID == "" {
			roomID = "default"
		}

		name := strings.TrimSpace(r.URL.Query().Get("name"))
		if name == "" {
			name = "Anonymous"
		}

		color := r.URL.Query().Get("color")
		if color == "" {
			color = randomColor()
		}

		room := hub.getOrCreateRoom(roomID)
		client := &Client{
			hub:   hub,
			room:  room,
			conn:  conn,
			send:  make(chan []byte, 256),
			id:    randomID(),
			name:  name,
			color: color,
		}

		room.register <- client
		go client.writePump()
		client.readPump()
	}
}

func isOriginAllowed(r *http.Request, allowedOrigins []string) bool {
	if len(allowedOrigins) == 0 {
		return true
	}

	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" {
		return true
	}

	for _, allowed := range allowedOrigins {
		if strings.EqualFold(allowed, origin) {
			return true
		}

		if strings.EqualFold(strings.TrimSuffix(allowed, "/"), strings.TrimSuffix(origin, "/")) {
			return true
		}
	}

	return false
}
