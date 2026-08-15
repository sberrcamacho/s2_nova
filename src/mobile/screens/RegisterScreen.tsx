import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { AuthLayout } from '@/mobile/layouts/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/state/AuthContext'
import { useToast } from '@/state/ToastContext'

interface FieldErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export default function RegisterScreen() {
  const { register, isSubmitting, error, clearError } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const validate = () => {
    const errors: FieldErrors = {}
    if (name.trim().length < 2) errors.name = 'Ingresa tu nombre completo.'
    if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Ingresa un correo válido.'
    if (password.length < 6) errors.password = 'Debe tener al menos 6 caracteres.'
    if (confirmPassword !== password) errors.confirmPassword = 'Las contraseñas no coinciden.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    if (!validate()) return
    const ok = await register({ name, email, password })
    if (ok) {
      showToast('Cuenta creada. ¡Bienvenida a S2 Nova!', 'success')
      navigate('/app/home', { replace: true })
    }
  }

  return (
    <AuthLayout title="Crea tu cuenta" subtitle="Empieza a organizar tus finanzas en minutos">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Nombre completo"
          placeholder="Mariana Torres"
          autoComplete="name"
          leftIcon={<User className="h-4 w-4" />}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
        />
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
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button type="button" onClick={() => setShowPassword((s) => !s)} className="pointer-events-auto" aria-label="Mostrar u ocultar contraseña">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <Input
          type={showPassword ? 'text' : 'password'}
          label="Confirmar contraseña"
          placeholder="Repite tu contraseña"
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
        />

        {error && (
          <p role="alert" className="rounded-[var(--radius-sm)] bg-negative-soft px-3 py-2 text-[13px] font-semibold text-negative">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth loading={isSubmitting} className="mt-2">
          Crear cuenta
        </Button>
      </form>

      <p className="mt-8 text-center text-[13.5px] font-medium text-ink-secondary">
        ¿Ya tienes cuenta?{' '}
        <Link to="/app/login" className="font-bold text-primary">
          Inicia sesión
        </Link>
      </p>
    </AuthLayout>
  )
}
