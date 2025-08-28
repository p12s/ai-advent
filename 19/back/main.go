package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"

	"chat-web-service-backend/internal"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)

	response := internal.HealthResponse{
		Status:  "ok",
		Service: "chat-web-service-backend",
		Version: "1.0.0",
	}

	json.NewEncoder(w).Encode(response)
}

func getPort() int {
	if portStr := os.Getenv("PORT"); portStr != "" {
		if port, err := strconv.Atoi(portStr); err == nil && port > 0 {
			return port
		}
	}
	return 8080
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found, using defaults")
	}

	log.Printf("Starting chat web service backend...")

	port := getPort()
	log.Printf("Using port: %d", port)

	r := mux.NewRouter()

	r.HandleFunc("/health", healthHandler).Methods("GET")
	r.HandleFunc("/ask", internal.AskHandler).Methods("POST")
	r.HandleFunc("/requirements", internal.RequirementsHandler).Methods("GET")
	r.HandleFunc("/build", internal.BuildHandler).Methods("POST")
	r.HandleFunc("/publish", internal.PublishHandler).Methods("POST")
	r.HandleFunc("/generate-image", internal.GenerateImageHandler).Methods("POST")
	r.HandleFunc("/improve-prompt", internal.ImprovePromptHandler).Methods("POST")

	// Serve static files from result directory
	r.PathPrefix("/result/").Handler(http.StripPrefix("/result/", http.FileServer(http.Dir("./result/"))))

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	handler := c.Handler(r)

	log.Printf("Chat web service backend running on port %d", port)
	log.Printf("Health endpoint available at: http://localhost:%d/health", port)

	log.Fatal(http.ListenAndServe(":"+strconv.Itoa(port), handler))
}
