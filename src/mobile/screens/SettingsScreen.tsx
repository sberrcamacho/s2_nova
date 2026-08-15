import { useState, type FormEvent } from 'react'
import { Fingerprint, Info, Mail, MapPin, Phone, User } from 'lucide-react'
import { MobileHeader } from '@/mobile/components/MobileHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/state/AuthContext'
import { useToast } from '@/state/ToastContext'
import { userService } from '@/services/userService'

export default function SettingsScreen() {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [city, setCity] = useState(user?.city ?? '')
  const [saving, setSaving] = useState(false)

  if (!user) return null

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await userService.updateProfile({ name, phone, city })
    updateUser({ name, phone, city })
    setSaving(false)
    showToast('Perfil actualizado', 'success')
  }

  const toggleBiometric = async (checked: boolean) => {
    updateUser({ preferences: { ...user.preferences, biometricLogin: checked } })
    await userService.updatePreferences({ biometricLogin: checked })
  }

  return (
    <div className="flex h-full flex-col">
      <MobileHeader title="Configuración" onBack />
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <form onSubmit={onSave} className="flex flex-col gap-4">
          <p className="px-1 text-[13px] font-bold text-ink">Información personal</p>
          <Input label="Nombre completo" leftIcon={<User className="h-4 w-4" />} value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Correo electrónico" leftIcon={<Mail className="h-4 w-4" />} value={user.email} disabled hint="El correo no se puede modificar en esta versión." />
          <Input label="Teléfono" leftIcon={<Phone className="h-4 w-4" />} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Ciudad" leftIcon={<MapPin className="h-4 w-4" />} value={city} onChange={(e) => setCity(e.target.value)} />
          <Button type="submit" loading={saving} fullWidth>
            Guardar cambios
          </Button>
        </form>

        <p className="mb-2 mt-7 px-1 text-[13px] font-bold text-ink">Seguridad</p>
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-primary">
            <Fingerprint className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-[13.5px] font-semibold text-ink">Inicio biométrico</p>
            <p className="text-xs text-ink-tertiary">Usa huella o Face ID para ingresar</p>
          </div>
          <Switch checked={user.preferences.biometricLogin} onChange={toggleBiometric} label="Inicio biométrico" />
        </Card>

        <p className="mb-2 mt-7 px-1 text-[13px] font-bold text-ink">Acerca de</p>
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-primary">
            <Info className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13.5px] font-semibold text-ink">S2 Nova</p>
            <p className="text-xs text-ink-tertiary">Versión 1.0.0 · Datos de demostración</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
