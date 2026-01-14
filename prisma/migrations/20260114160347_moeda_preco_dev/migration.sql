/*
  Warnings:

  - You are about to drop the `moeda` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "moeda";

-- CreateTable
CREATE TABLE "Moeda" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "dataDeCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Moeda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preco" (
    "id" TEXT NOT NULL,
    "moedaId" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "dataDoValor" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preco_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Moeda_symbol_key" ON "Moeda"("symbol");

-- CreateIndex
CREATE INDEX "Preco_moedaId_dataDoValor_idx" ON "Preco"("moedaId", "dataDoValor");

-- CreateIndex
CREATE UNIQUE INDEX "Preco_moedaId_dataDoValor_key" ON "Preco"("moedaId", "dataDoValor");

-- AddForeignKey
ALTER TABLE "Preco" ADD CONSTRAINT "Preco_moedaId_fkey" FOREIGN KEY ("moedaId") REFERENCES "Moeda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
