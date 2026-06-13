package main

import (
	"crypto/rand"
	"encoding/hex"
)

var defaultColors = []string{
	"#e57373", "#f06292", "#ba68c8", "#9575cd",
	"#7986cb", "#64b5f6", "#4dd0e1", "#4db6ac",
	"#81c784", "#aed581", "#ffb74d", "#ff8a65",
}

func randomID() string {
	buf := make([]byte, 8)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

func randomColor() string {
	buf := make([]byte, 1)
	_, _ = rand.Read(buf)
	return defaultColors[int(buf[0])%len(defaultColors)]
}
