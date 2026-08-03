package seeder

import (
	"math/rand"
	"time"

	"nfe_simulador/internal/generator"
	"nfe_simulador/internal/models"

	"gorm.io/gorm"
)

// ExecutarHistorico popula o banco com 65 dias de dados caso esteja vazio
func ExecutarHistorico(db *gorm.DB) {
	var count int64
	err := db.Model(&models.Nota{}).Count(&count).Error
	if err != nil || count > 0 {
		return
	}

	hoje := time.Now().UTC()
	dataInicio := hoje.AddDate(0, 0, -65)

	for d := dataInicio; d.Before(hoje); d = d.AddDate(0, 0, 1) {
		weekday := d.Weekday()

		if weekday == time.Saturday || weekday == time.Sunday {
			continue
		}

		qtdNotasNoDia := rand.Intn(451) + 50

		for i := 0; i < qtdNotasNoDia; i++ {
			horaAleatoria := rand.Intn(24)
			minutoAleatorio := rand.Intn(60)
			segundoAleatorio := rand.Intn(60)

			dataNota := time.Date(d.Year(), d.Month(), d.Day(), horaAleatoria, minutoAleatorio, segundoAleatorio, 0, d.Location())

			// Chama a função exportada do pacote generator
			generator.GerarEGravarNota(db, dataNota)
		}
	}
}
