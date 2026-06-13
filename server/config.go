package main

import (
	"os"
	"strings"
)

// Config holds runtime settings for the collab server.
type Config struct {
	Port           string
	StaticDir      string
	AllowedOrigins []string
}

func loadConfig() Config {
	port := getEnv("PORT", "8081")
	return Config{
		Port:           port,
		StaticDir:      getEnv("STATIC_DIR", ""),
		AllowedOrigins: parseCommaSeparated(getEnv("ALLOWED_ORIGINS", "")),
	}
}

func getEnv(key, fallback string) string {
	if value := strings.TrimSpace(strings.Trim(os.Getenv(key), "\n\r")); value != "" {
		return value
	}
	return fallback
}

func parseCommaSeparated(value string) []string {
	if value == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
