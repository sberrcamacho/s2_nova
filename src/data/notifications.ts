export interface AppNotification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  tone: 'positive' | 'warning' | 'info'
}

export const notifications: AppNotification[] = [
  { id: 'n1', title: 'Presupuesto casi al límite', message: 'Ya usaste el 84% del presupuesto de Alimentación.', time: 'Hace 2 h', read: false, tone: 'warning' },
  { id: 'n2', title: 'Salario recibido', message: 'Se acreditó tu nómina mensual.', time: 'Hace 1 día', read: false, tone: 'positive' },
  { id: 'n3', title: 'Compra registrada', message: 'Se registró una compra escaneada en Éxito.', time: 'Hace 2 días', read: true, tone: 'info' },
  { id: 'n4', title: 'Resumen mensual disponible', message: 'Tu reporte del mes anterior ya está listo.', time: 'Hace 3 días', read: true, tone: 'info' },
]
