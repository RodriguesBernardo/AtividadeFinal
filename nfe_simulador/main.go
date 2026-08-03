package main

import (
	"io"
	"log"
	"os"
	"time"

	"nfe_simulador/internal/generator"
	"nfe_simulador/internal/seeder"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func init() {
	// Silencia todos os logs padrão
	log.SetOutput(io.Discard)
}

func main() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://postgres:postgres_password@db:5432/nfe_db?sslmode=disable"
	}

	db, err := gorm.Open(postgres.Open(connStr), &gorm.Config{})
	if err != nil {
		os.Exit(1)
	}

	sqlDB, err := db.DB()
	if err != nil {
		os.Exit(1)
	}
	defer sqlDB.Close()

	for {
		if err := sqlDB.Ping(); err == nil {
			break
		}
		time.Sleep(2 * time.Second)
	}

	// Inicia a carga retroativa
	seeder.ExecutarHistorico(db)

	// Inicia a geração em tempo real
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		generator.GerarEGravarNota(db, time.Now().UTC())
	}
}
