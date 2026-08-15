import { useState, type FormEvent } from 'react'
import { Bell, Fingerprint, Mail, MapPin, Moon, Phone, Sun, User } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/state/AuthContext'
import { useTheme } from '@/state/ThemeContext'
import { useToast } from '@/state/ToastContext'
import { userService } from '@/services/userService'

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const { theme, setTheme } = useTheme()
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

  const toggleNotifications = async (checked: boolean) => {
    updateUser({ preferences: { ...user.preferences, notifications: checked } })
    await userService.updatePreferences({ notifications: checked })
  }

  const toggleBiometric = async (checked: boolean) => {
    updateUser({ preferences: { ...user.preferences, biometricLogin: checked } })
    await userService.updatePreferences({ biometricLogin: checked })
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Card className="flex flex-col items-center gap-3 p-6 text-center xl:col-span-1">
        <Avatar initials={user.avatarInitials} size="lg" />
        <div>
          <p className="text-base font-bold text-ink">{user.name}</p>
          <p className="text-[13px] text-ink-tertiary">{user.email}</p>
        </div>
        <p className="text-xs font-medium text-ink-tertiary">{user.city}</p>
      </Card>

      <Card className="p-6 xl:col-span-2">
        <h3 className="mb-4 text-[15px] font-bold text-ink">Información personal</h3>
        <form onSubmit={onSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nombre completo" leftIcon={<User className="h-4 w-4" />} value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Correo electrónico" leftIcon={<Mail className="h-4 w-4" />} value={user.email} disabled />
          <Input label="Teléfono" leftIcon={<Phone className="h-4 w-4" />} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Ciudad" leftIcon={<MapPin className="h-4 w-4" />} value={city} onChange={(e) => setCity(e.target.value)} />
          <Button type="submit" loading={saving} className="sm:col-span-2 sm:w-fit">
            Guardar cambios
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-4 p-6 xl:col-span-3">
        <h3 className="text-[15px] font-bold text-ink">Preferencias</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <PreferenceTile icon={theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} label="Tema">
            <div className="flex overflow-hidden rounded-full border border-border">
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-3 py-1 text-xs font-bold transition-colors ${theme === t ? 'bg-primary text-on-primary' : 'text-ink-secondary'}`}
                >
                  {t === 'light' ? 'Claro' : 'Oscuro'}
                </button>
              ))}
            </div>
          </PreferenceTile>
          <PreferenceTile icon={<Bell className="h-4 w-4" />} label="Notificaciones">
            <Switch checked={user.preferences.notifications} onChange={toggleNotifications} label="Notificaciones" />
          </PreferenceTile>
          <PreferenceTile icon={<Fingerprint className="h-4 w-4" />} label="Inicio biométrico">
            <Switch checked={user.preferences.biometricLogin} onChange={toggleBiometric} label="Inicio biométrico" />
          </PreferenceTile>
        </div>
      </Card>
    </div>
  )
}

function PreferenceTile({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-primary">{icon}</span>
      <span className="flex-1 text-[13.5px] font-semibold text-ink">{label}</span>
      {children}
    </div>
  )
}
