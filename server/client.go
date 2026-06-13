package main

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 64 * 1024
)

type Client struct {
	hub    *Hub
	room   *Room
	conn   *websocket.Conn
	send   chan []byte
	id     string
	name   string
	color  string
}

type incomingMessage struct {
	Type   string `json:"type"`
	Pos    int    `json:"pos"`
	Length int    `json:"length"`
	Text   string `json:"text"`
	Cursor int    `json:"cursor"`
	SelectionStart int `json:"selectionStart"`
	SelectionEnd   int `json:"selectionEnd"`
}

func (c *Client) readPump() {
	defer func() {
		c.room.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("websocket read error: %v", err)
			}
			break
		}

		var msg incomingMessage
		if err := json.Unmarshal(raw, &msg); err != nil {
			continue
		}

		switch msg.Type {
		case "insert":
			version, ok := c.room.doc.ApplyInsert(msg.Pos, msg.Text)
			if !ok {
				continue
			}
			out, _ := json.Marshal(map[string]interface{}{
				"type":     "insert",
				"clientId": c.id,
				"pos":      msg.Pos,
				"text":     msg.Text,
				"version":  version,
			})
			c.room.broadcastExcept(c, out)

		case "delete":
			version, ok := c.room.doc.ApplyDelete(msg.Pos, msg.Length)
			if !ok {
				continue
			}
			out, _ := json.Marshal(map[string]interface{}{
				"type":     "delete",
				"clientId": c.id,
				"pos":      msg.Pos,
				"length":   msg.Length,
				"version":  version,
			})
			c.room.broadcastExcept(c, out)

		case "cursor":
			out, _ := json.Marshal(map[string]interface{}{
				"type":           "cursor",
				"clientId":       c.id,
				"name":           c.name,
				"color":          c.color,
				"cursor":         msg.Cursor,
				"selectionStart": msg.SelectionStart,
				"selectionEnd":   msg.SelectionEnd,
			})
			c.room.broadcastExcept(c, out)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
