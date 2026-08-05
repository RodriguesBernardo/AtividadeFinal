package models

import (
	"time"
)

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
	DataEnvioCobranca *time.Time `gorm:"column:data_envio_cobranca"`

	// Relationship
	Itens []Item `gorm:"foreignKey:IdFkNota;references:ID;constraint:OnDelete:CASCADE"`
}

func (Nota) TableName() string {
	return "notas"
}

type Item struct {
	IDUnico        int64   `gorm:"primaryKey;column:id_unico;autoIncrement"`
	IdFkNota       int64   `gorm:"column:id_fk_nota;not null"`
	Posicao        int     `gorm:"column:posicao;not null"`
	CodItem        string  `gorm:"column:cod_item;type:char(8);not null"`
	Descricao      string  `gorm:"column:descricao;type:varchar(100);not null"`
	ValorItemTotal float64 `gorm:"column:valor_item_total;type:decimal(10,2);not null"`
	Quantidade     int     `gorm:"column:quantidade;not null"`
}

func (Item) TableName() string {
	return "itens"
}
