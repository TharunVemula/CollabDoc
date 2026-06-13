package main

import (
	"encoding/json"
	"log"
	"sync"
)

type Hub struct {
	mu    sync.RWMutex
	rooms map[string]*Room
}

type Room struct {
	mu         sync.RWMutex
	id         string
	doc        *Document
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{rooms: make(map[string]*Room)}
}

func (h *Hub) getOrCreateRoom(id string) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()
	if room, ok := h.rooms[id]; ok {
		return room
	}
	room := &Room{
		id:         id,
		doc:        NewDocument(),
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
	h.rooms[id] = room
	go room.run()
	return room
}

func (r *Room) run() {
	for {
		select {
		case client := <-r.register:
			r.mu.Lock()
			r.clients[client] = true
			r.mu.Unlock()
			content, version := r.doc.Snapshot()
			joinMsg, _ := json.Marshal(map[string]interface{}{
				"type":    "sync",
				"content": content,
				"version": version,
				"users":   r.userList(),
			})
			client.send <- joinMsg
			r.broadcastPresence()

		case client := <-r.unregister:
			r.mu.Lock()
			if _, ok := r.clients[client]; ok {
				delete(r.clients, client)
				close(client.send)
			}
			r.mu.Unlock()
			r.broadcastPresence()

		case message := <-r.broadcast:
			for client := range r.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(r.clients, client)
				}
			}
		}
	}
}

func (r *Room) userList() []map[string]string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	users := make([]map[string]string, 0, len(r.clients))
	for c := range r.clients {
		users = append(users, map[string]string{
			"id":   c.id,
			"name": c.name,
			"color": c.color,
		})
	}
	return users
}

func (r *Room) broadcastPresence() {
	msg, _ := json.Marshal(map[string]interface{}{
		"type":  "presence",
		"users": r.userList(),
	})
	r.mu.RLock()
	defer r.mu.RUnlock()
	for c := range r.clients {
		select {
		case c.send <- msg:
		default:
			log.Printf("presence: slow client %s", c.id)
		}
	}
}

func (r *Room) broadcastExcept(sender *Client, payload []byte) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for client := range r.clients {
		if client == sender {
			continue
		}
		select {
		case client.send <- payload:
		default:
			log.Printf("dropping slow client %s", client.id)
		}
	}
}
