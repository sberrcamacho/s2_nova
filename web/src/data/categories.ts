import type { Category, PaymentMethod } from '@/types'

// Colors are deliberately varied (not all purple) so category chips, chart
// legends, and budget rows stay easy to tell apart at a glance. Purple stays
// reserved for brand/primary actions per the S2 Nova identity.
export const categories: Category[] = [
  { id: 'food', label: 'Alimentación', icon: 'UtensilsCrossed', color: '#E8A23D', kind: 'expense' },
  { id: 'transportation', label: 'Transporte', icon: 'Car', color: '#3D8BE8', kind: 'expense' },
  { id: 'shopping', label: 'Compras', icon: 'ShoppingBag', color: '#3DBBA8', kind: 'expense' },
  { id: 'health', label: 'Salud', icon: 'HeartPulse', color: '#E85D6B', kind: 'expense' },
  { id: 'education', label: 'Educación', icon: 'GraduationCap', color: '#5D6BE8', kind: 'expense' },
  { id: 'entertainment', label: 'Entretenimiento', icon: 'Popcorn', color: '#B25DE8', kind: 'expense' },
  { id: 'bills', label: 'Servicios', icon: 'Receipt', color: '#8A8A99', kind: 'expense' },
  { id: 'subscriptions', label: 'Suscripciones', icon: 'RefreshCcw', color: '#D95DB2', kind: 'expense' },
  { id: 'salary', label: 'Salario', icon: 'Wallet', color: '#22A06B', kind: 'income' },
  { id: 'freelance', label: 'Freelance', icon: 'Laptop', color: '#6657E8', kind: 'income' },
  { id: 'other', label: 'Otros', icon: 'CircleEllipsis', color: '#9C9CAA', kind: 'both' },
]

export const categoryMap: Record<string, Category> = Object.fromEntries(
  categories.map((category) => [category.id, category]),
)

export const expenseCategories = categories.filter((c) => c.kind === 'expense' || c.kind === 'both')
export const incomeCategories = categories.filter((c) => c.kind === 'income' || c.kind === 'both')

export const paymentMethods: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'cash', label: 'Efectivo', icon: 'Banknote' },
  { id: 'debit_card', label: 'Tarjeta débito', icon: 'CreditCard' },
  { id: 'credit_card', label: 'Tarjeta crédito', icon: 'CreditCard' },
  { id: 'bank_transfer', label: 'Transferencia', icon: 'Landmark' },
  { id: 'nequi', label: 'Nequi', icon: 'Smartphone' },
  { id: 'daviplata', label: 'Daviplata', icon: 'Smartphone' },
]
