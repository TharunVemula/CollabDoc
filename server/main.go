package main

import (
	"log"
	"net/http"
)

func main() {
	cfg := loadConfig()
	hub := NewHub()
	server := newServer(cfg, hub)

	addr := ":" + cfg.Port
	log.Printf("collab server listening on %s", addr)
	if err := http.ListenAndServe(addr, server); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
