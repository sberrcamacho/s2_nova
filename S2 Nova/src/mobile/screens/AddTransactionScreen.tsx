import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, FileText, Landmark } from 'lucide-react'
import { MobileHeader } from '@/mobile/components/MobileHeader'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useAppData } from '@/state/AppDataContext'
import { useToast } from '@/state/ToastContext'
import { expenseCategories, incomeCategories, paymentMethods } from '@/data/categories'
import { todayISO } from '@/lib/date'
import type { CategoryId, PaymentMethod, TransactionType } from '@/types'

interface FormErrors {
  description?: string
  amount?: string
  category?: string
}

export default function AddTransactionScreen() {
  const { addTransaction } = useAppData()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [type, setType] = useState<TransactionType>('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<CategoryId | ''>('')
  const [date, setDate] = useState(todayISO())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('debit_card')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categoryOptions = useMemo(
    () => (type === 'expense' ? expenseCategories : incomeCategories).map((c) => ({ value: c.id, label: c.label })),
    [type],
  )

  const validate = () => {
    const next: FormErrors = {}
    if (!description.trim()) next.description = 'Agrega una descripción.'
    const numericAmount = Number(amount)
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) next.amount = 'Ingresa un monto válido.'
    if (!category) next.category = 'Selecciona una categoría.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    await addTransaction({
      description: description.trim(),
      amount: Number(amount),
      type,
      category: category as CategoryId,
      date,
      paymentMethod,
      note: note.trim() || undefined,
    })
    setIsSubmitting(false)
    showToast(type === 'income' ? 'Ingreso registrado' : 'Gasto registrado', 'success')
    navigate('/app/home')
  }

  return (
    <div className="flex h-full flex-col">
      <MobileHeader title="Agregar movimiento" onBack />

      <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-8">
        <div className="grid grid-cols-2 gap-2 rounded-full border border-border bg-bg-secondary p-1">
          {(['expense', 'income'] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t)
                setCategory('')
              }}
              className={`rounded-full py-2.5 text-sm font-bold transition-all ${
                type === t
                  ? t === 'expense'
                    ? 'bg-negative text-white shadow-[var(--shadow-sm)]'
                    : 'bg-positive text-white shadow-[var(--shadow-sm)]'
                  : 'text-ink-secondary'
              }`}
            >
              {t === 'expense' ? 'Gasto' : 'Ingreso'}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-ink-secondary" htmlFor="amount">
            Monto
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-ink-tertiary">$</span>
            <input
              id="amount"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              className="font-numeric h-16 w-full rounded-[var(--radius-md)] border border-border bg-surface pl-8 text-3xl font-extrabold text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {errors.amount && <p className="mt-1.5 text-xs font-medium text-negative">{errors.amount}</p>}
        </div>

        <Input
          label="Descripción"
          placeholder="Ej. Mercado semanal"
          leftIcon={<FileText className="h-4 w-4" />}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
        />

        <Select
          label="Categoría"
          placeholder="Selecciona una categoría"
          options={categoryOptions}
          value={category}
          onChange={(e) => setCategory(e.target.value as CategoryId)}
          error={errors.category}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label="Fecha"
            leftIcon={<Calendar className="h-4 w-4" />}
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
          <Select
            label="Método de pago"
            leftIcon={<Landmark className="h-4 w-4" />}
            options={paymentMethods.map((m) => ({ value: m.id, label: m.label }))}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          />
        </div>

        <Input label="Nota (opcional)" placeholder="Agrega una nota" value={note} onChange={(e) => setNote(e.target.value)} />

        <Button type="submit" size="lg" fullWidth loading={isSubmitting} className="mt-auto">
          Guardar movimiento
        </Button>
      </form>
    </div>
  )
}
