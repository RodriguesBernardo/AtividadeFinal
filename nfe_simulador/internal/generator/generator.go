package generator

import (
	"fmt"
	"math/rand"
	"time"

	"nfe_simulador/internal/models"

	"gorm.io/gorm"
)

type Produto struct {
	Codigo    string
	Descricao string
}

var (
	estadosBrasileiros = []string{
		"AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
		"PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO", "EX",
	}
	catalogoProdutos [100]Produto
	marcasMonitor    = []string{"Dell", "LG", "Samsung", "AOC", "Acer", "BenQ", "Asus", "Philips", "Alienware", "Husky"}
	tamanhosMonitor  = []int{15, 17, 19, 21, 24, 25, 27, 29, 32, 34, 49}
)

func init() {
	rand.Seed(time.Now().UnixNano())

	for i := 0; i < 100; i++ {
		codigo := gerarStringAleatoria(8)
		marca := marcasMonitor[rand.Intn(len(marcasMonitor))]
		tamanho := tamanhosMonitor[rand.Intn(len(tamanhosMonitor))]

		catalogoProdutos[i] = Produto{
			Codigo:    codigo,
			Descricao: fmt.Sprintf("Monitor %s %d polegadas", marca, tamanho),
		}
	}
}

// GerarEGravarNota exportada (letra maiúscula) para ser chamada pelo main e pelo seeder
func GerarEGravarNota(db *gorm.DB, dataCriacao time.Time) {
	serieNf := fmt.Sprintf("%d", rand.Intn(3)+1)
	somaFaturamento := rand.Float32() < 0.80

	statusSefaz := "R"
	if rand.Float32() < 0.95 {
		statusSefaz = "A"
	}

	cliente := gerarCNPJFormatado()
	ufCliente := estadosBrasileiros[rand.Intn(len(estadosBrasileiros))]

	pagamentos := []string{"P", "M", "N"}
	notaJaPaga := pagamentos[rand.Intn(len(pagamentos))]

	qtdItens := rand.Intn(48) + 1
	var valorTotalNota float64 = 0.0

	itens := make([]models.Item, qtdItens)

	for i := 0; i < qtdItens; i++ {
		valorItem := float64(rand.Intn(150)) / 100.0
		if valorItem <= 0 {
			valorItem = 1.0
		}

		produto := catalogoProdutos[rand.Intn(100)]

		itens[i] = models.Item{
			Posicao:        i + 1,
			CodItem:        produto.Codigo,
			Descricao:      produto.Descricao,
			ValorItemTotal: valorItem,
			Quantidade:     rand.Intn(50) + 1,
		}
		valorTotalNota += valorItem
	}

	nota := models.Nota{
		SerieNF:         serieNf,
		SomaFaturamento: somaFaturamento,
		Cliente:         cliente,
		UfCliente:       ufCliente,
		StatusSefaz:     statusSefaz,
		NotaJaPaga:      notaJaPaga,
		ValorDaNota:     valorTotalNota,
		CreatedAt:       dataCriacao,
		Itens:           itens,
	}

	db.Create(&nota)
}

func gerarStringAleatoria(tamanho int) string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, tamanho)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}

func gerarCNPJFormatado() string {
	n1 := rand.Intn(90) + 10
	n2 := rand.Intn(900) + 100
	n3 := rand.Intn(900) + 100
	dv := rand.Intn(90) + 10

	return fmt.Sprintf("%02d.%03d.%03d/0001-%02d", n1, n2, n3, dv)
}
