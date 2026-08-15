import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MailCheck } from 'lucide-react'
import { AuthLayout } from '@/mobile/layouts/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authService } from '@/services/authService'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Ingresa un correo válido.')
      return
    }
    setError('')
    setIsSubmitting(true)
    const result = await authService.requestPasswordReset(email)
    setIsSubmitting(false)
    setSent(result.sent || true) // Always confirm to the user, regardless of match (avoids account enumeration).
  }

  if (sent) {
    return (
      <AuthLayout title="Revisa tu correo" subtitle="Te enviamos un enlace para restablecer tu contraseña">
        <div className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-positive-soft text-positive">
            <MailCheck className="h-6 w-6" />
          </span>
          <p className="text-[13.5px] font-medium text-ink-secondary">
            Si <span className="font-bold text-ink">{email}</span> está registrado, recibirás un correo con instrucciones en unos minutos.
          </p>
          <Link to="/app/login" className="w-full">
            <Button variant="secondary" fullWidth>
              Volver a iniciar sesión
            </Button>
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="¿Olvidaste tu contraseña?" subtitle="Te enviaremos un enlace para restablecerla">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          type="email"
          label="Correo electrónico"
          placeholder="tucorreo@ejemplo.com"
          leftIcon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
        <Button type="submit" size="lg" fullWidth loading={isSubmitting} className="mt-2">
          Enviar enlace
        </Button>
      </form>
      <p className="mt-8 text-center text-[13.5px] font-medium text-ink-secondary">
        <Link to="/app/login" className="font-bold text-primary">
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  )
}
