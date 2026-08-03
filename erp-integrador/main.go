package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Integra o catálogo público da FakeStore API (https://fakestoreapi.com) como uma
// segunda origem de notas fiscais, gravando nas MESMAS tabelas `notas`/`itens`
// que o nfe_simulador usa. Como todo pedido FakeStore é tratado como mercado
// "EX" (Exterior), ele entra automaticamente no pipeline existente (ETL,
// faturamento por mercado, câmbio) sem precisar de nenhuma mudança de schema.

const (
	fakeStoreProdutosURL = "https://fakestoreapi.com/products"
	serieOrigemFakeStore = "9"
	diasHistorico        = 65
	intervaloTempoReal   = 30 * time.Second
)

type FakeProduct struct {
	ID       int     `json:"id"`
	Title    string  `json:"title"`
	Price    float64 `json:"price"`
	Category string  `json:"category"`
}

type Nota struct {
	ID              int64     `gorm:"primaryKey;column:id;autoIncrement"`
	SerieNF         string    `gorm:"column:serie_nf;type:char(1);not null"`
	SomaFaturamento bool      `gorm:"column:soma_faturamento;not null"`
	Cliente         string    `gorm:"column:cliente;type:char(18);not null"`
	UfCliente       string    `gorm:"column:uf_cliente;type:char(2);not null"`
	CreatedAt       time.Time `gorm:"column:created_at;not null"`
	StatusSefaz     string    `gorm:"column:status_sefaz;type:char(1);not null"`
	NotaJaPaga      string    `gorm:"column:nota_ja_paga;type:char(1);not null"`
	ValorDaNota     float64   `gorm:"column:valor_da_nota;type:decimal(12,2);not null"`

	Itens []Item `gorm:"foreignKey:IdFkNota;references:ID;constraint:OnDelete:CASCADE"`
}

func (Nota) TableName() string { return "notas" }

type Item struct {
	IDUnico        int64   `gorm:"primaryKey;column:id_unico;autoIncrement"`
	IdFkNota       int64   `gorm:"column:id_fk_nota;not null"`
	Posicao        int     `gorm:"column:posicao;not null"`
	CodItem        string  `gorm:"column:cod_item;type:char(8);not null"`
	Descricao      string  `gorm:"column:descricao;type:varchar(100);not null"`
	ValorItemTotal float64 `gorm:"column:valor_item_total;type:decimal(10,2);not null"`
	Quantidade     int     `gorm:"column:quantidade;not null"`
}

func (Item) TableName() string { return "itens" }

// Nomes curtos para virar a "categoria" extraída pelo ETL (que pega a 2ª palavra da descrição)
var categoriasFakeStore = map[string]string{
	"electronics":     "Eletronicos",
	"jewelery":        "Joias",
	"men's clothing":  "ModaMasculina",
	"women's clothing": "ModaFeminina",
}

func init() {
	rand.Seed(time.Now().UnixNano())
	log.SetOutput(io.Discard)
}

func main() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://postgres:postgres_password@db_transacional:5432/nfe_db?sslmode=disable"
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

	produtos := buscarCatalogoComRetry()

	seedarHistoricoFakeStore(db, produtos)

	ticker := time.NewTicker(intervaloTempoReal)
	defer ticker.Stop()

	for range ticker.C {
		gerarEGravarNotaFakeStore(db, produtos, time.Now().UTC())
	}
}

func buscarCatalogoComRetry() []FakeProduct {
	client := &http.Client{Timeout: 10 * time.Second}

	for {
		resp, err := client.Get(fakeStoreProdutosURL)
		if err == nil && resp.StatusCode == http.StatusOK {
			defer resp.Body.Close()
			var produtos []FakeProduct
			if json.NewDecoder(resp.Body).Decode(&produtos) == nil && len(produtos) > 0 {
				return produtos
			}
		}
		if resp != nil {
			resp.Body.Close()
		}
		time.Sleep(5 * time.Second)
	}
}

// seedarHistoricoFakeStore popula ~65 dias de pedidos FakeStore caso ainda não existam
func seedarHistoricoFakeStore(db *gorm.DB, produtos []FakeProduct) {
	var count int64
	if err := db.Model(&Nota{}).Where("serie_nf = ?", serieOrigemFakeStore).Count(&count).Error; err != nil || count > 0 {
		return
	}

	hoje := time.Now().UTC()
	dataInicio := hoje.AddDate(0, 0, -diasHistorico)

	for d := dataInicio; d.Before(hoje); d = d.AddDate(0, 0, 1) {
		weekday := d.Weekday()
		if weekday == time.Saturday || weekday == time.Sunday {
			continue
		}

		qtdPedidosNoDia := rand.Intn(51) + 10 // 10 a 60 pedidos/dia
		for i := 0; i < qtdPedidosNoDia; i++ {
			horaAleatoria := rand.Intn(24)
			minutoAleatorio := rand.Intn(60)
			segundoAleatorio := rand.Intn(60)
			dataPedido := time.Date(d.Year(), d.Month(), d.Day(), horaAleatoria, minutoAleatorio, segundoAleatorio, 0, d.Location())

			gerarEGravarNotaFakeStore(db, produtos, dataPedido)
		}
	}
}

func gerarEGravarNotaFakeStore(db *gorm.DB, produtos []FakeProduct, dataCriacao time.Time) {
	userID := rand.Intn(9000) + 1

	statusSefaz := "R"
	if rand.Float32() < 0.95 {
		statusSefaz = "A"
	}
	pagamentos := []string{"P", "M", "N"}
	notaJaPaga := pagamentos[rand.Intn(len(pagamentos))]

	qtdItens := rand.Intn(5) + 1
	itens := make([]Item, qtdItens)
	var valorTotalNota float64

	for i := 0; i < qtdItens; i++ {
		produto := produtos[rand.Intn(len(produtos))]
		quantidade := rand.Intn(3) + 1
		valorItem := arredondar(produto.Price * float64(quantidade))

		categoria := categoriasFakeStore[produto.Category]
		if categoria == "" {
			categoria = "Outros"
		}

		descricao := fmt.Sprintf("FakeStore %s %s", categoria, produto.Title)
		if len(descricao) > 100 {
			descricao = descricao[:100]
		}

		itens[i] = Item{
			Posicao:        i + 1,
			CodItem:        fmt.Sprintf("FS%06d", produto.ID),
			Descricao:      descricao,
			ValorItemTotal: valorItem,
			Quantidade:     quantidade,
		}
		valorTotalNota += valorItem
	}

	nota := Nota{
		SerieNF:         serieOrigemFakeStore,
		SomaFaturamento: true,
		Cliente:         fmt.Sprintf("FKSTORE-USR-%05d", userID),
		UfCliente:       "EX", // FakeStore é tratada como mercado Exterior (preços já em USD)
		CreatedAt:       dataCriacao,
		StatusSefaz:     statusSefaz,
		NotaJaPaga:      notaJaPaga,
		ValorDaNota:     valorTotalNota,
		Itens:           itens,
	}

	db.Create(&nota)
}

func arredondar(v float64) float64 {
	return float64(int64(v*100+0.5)) / 100
}
