package main

import "sync"

// Document holds shared state for one room.
type Document struct {
	mu      sync.RWMutex
	Content string
	Version int64
}

func NewDocument() *Document {
	return &Document{}
}

func (d *Document) Snapshot() (content string, version int64) {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.Content, d.Version
}

func (d *Document) ApplyInsert(pos int, text string) (version int64, ok bool) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if pos < 0 || pos > len(d.Content) {
		return d.Version, false
	}
	d.Content = d.Content[:pos] + text + d.Content[pos:]
	d.Version++
	return d.Version, true
}

func (d *Document) ApplyDelete(pos, length int) (version int64, ok bool) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if pos < 0 || length < 0 || pos+length > len(d.Content) {
		return d.Version, false
	}
	d.Content = d.Content[:pos] + d.Content[pos+length:]
	d.Version++
	return d.Version, true
}
