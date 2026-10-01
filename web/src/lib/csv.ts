import type { ImportRow } from '@/services/userService'

// Minimal RFC 4180 reader: quoted cells, doubled quotes, CRLF or LF, BOM.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const input = text.replace(/^﻿/, '')
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim() !== '')) rows.push(row)
  return rows
}

const plain = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()

function parseAmount(raw: string): number {
  let value = raw.replace(/[^\d.,-]/g, '')
  if (value.includes(',') && !value.includes('.')) value = value.replace(',', '.')
  else value = value.replace(/,/g, '')
  return Number(value)
}

// Turns the import template (fecha, título, monto, tipo, categoría,
// billetera) into rows for the backend. Cells that don't parse are passed on
// as-is so the server reports them per row.
export function csvToImportRows(text: string): ImportRow[] | null {
  const [header, ...body] = parseCsv(text)
  if (!header) return null
  const col = (name: string) => header.map(plain).indexOf(name)
  const idx = { date: col('fecha'), title: col('titulo'), amount: col('monto'), type: col('tipo'), category: col('categoria'), wallet: col('billetera') }
  if (idx.date < 0 || idx.title < 0 || idx.amount < 0 || idx.type < 0 || idx.wallet < 0) return null
  return body.map((cells) => {
    const kind = plain(cells[idx.type] ?? '')
    return {
      date: (cells[idx.date] ?? '').trim(),
      title: (cells[idx.title] ?? '').trim(),
      amount: parseAmount(cells[idx.amount] ?? ''),
      type: (kind === 'ingreso' || kind === 'income' ? 'INCOME' : kind === 'gasto' || kind === 'expense' ? 'EXPENSE' : kind) as ImportRow['type'],
      category: idx.category >= 0 ? (cells[idx.category] ?? '').trim() || undefined : undefined,
      wallet: (cells[idx.wallet] ?? '').trim(),
    }
  })
}
