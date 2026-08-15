import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { AuthLayout } from '@/mobile/layouts/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/state/AuthContext'
import { useToast } from '@/state/ToastContext'
import { demoCredentials } from '@/data/user'

export default function LoginScreen() {
  const { login, isSubmitting, error, clearError } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const validate = () => {
    const errors: typeof fieldErrors = {}
    if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Ingresa un correo válido.'
    if (password.length < 4) errors.password = 'La contraseña es muy corta.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    if (!validate()) return
    const ok = await login({ email, password })
    if (ok) {
      showToast('Bienvenida de nuevo', 'success')
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/app/home', { replace: true })
    }
  }

  return (
    <AuthLayout title="Bienvenido de nuevo" subtitle="Inicia sesión para continuar con tus finanzas">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          type="email"
          label="Correo electrónico"
          placeholder="tucorreo@ejemplo.com"
          autoComplete="email"
          leftIcon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <Input
          type={showPassword ? 'text' : 'password'}
          label="Contraseña"
          placeholder="••••••••"
          autoComplete="current-password"
          leftIcon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setShowPassword((s) => !s)}
              className="pointer-events-auto"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />

        <div className="flex justify-end">
          <Link to="/app/forgot-password" className="text-[13px] font-semibold text-primary">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {error && (
          <p role="alert" className="rounded-[var(--radius-sm)] bg-negative-soft px-3 py-2 text-[13px] font-semibold text-negative">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth loading={isSubmitting} className="mt-2">
          Iniciar sesión
        </Button>

        <p className="rounded-[var(--radius-sm)] bg-bg-secondary px-3 py-2 text-center text-xs font-medium text-ink-tertiary">
          Demo: {demoCredentials.email} / {demoCredentials.password}
        </p>
      </form>

      <p className="mt-8 text-center text-[13.5px] font-medium text-ink-secondary">
        ¿No tienes cuenta?{' '}
        <Link to="/app/register" className="font-bold text-primary">
          Regístrate
        </Link>
      </p>
    </AuthLayout>
  )
}
