import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, LogOut, Moon, Settings, ShieldCheck, Sun } from 'lucide-react'
import { MobileHeader } from '@/mobile/components/MobileHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/state/AuthContext'
import { useTheme } from '@/state/ThemeContext'
import { useToast } from '@/state/ToastContext'
import { userService } from '@/services/userService'

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const { showToast } = useToast()
  const navigate = useNavigate()

  if (!user) return null

  const toggleNotifications = async (checked: boolean) => {
    updateUser({ preferences: { ...user.preferences, notifications: checked } })
    await userService.updatePreferences({ notifications: checked })
  }

  const onLogout = () => {
    logout()
    showToast('Sesión cerrada', 'info')
    navigate('/app/login', { replace: true })
  }

  return (
    <div className="flex h-full flex-col">
      <MobileHeader title="Perfil" />
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          <Avatar initials={user.avatarInitials} size="lg" />
          <div>
            <p className="text-base font-bold text-ink">{user.name}</p>
            <p className="text-[13px] text-ink-tertiary">{user.email}</p>
          </div>
          <p className="text-xs font-medium text-ink-tertiary">{user.city} · Miembro desde {new Date(user.memberSince).getFullYear()}</p>
        </Card>

        <p className="mb-2 mt-6 px-1 text-[13px] font-bold text-ink">Preferencias</p>
        <Card className="divide-y divide-border">
          <PreferenceRow icon={theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} label="Tema">
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
          </PreferenceRow>
          <PreferenceRow icon={<Bell className="h-4 w-4" />} label="Notificaciones">
            <Switch checked={user.preferences.notifications} onChange={toggleNotifications} label="Notificaciones" />
          </PreferenceRow>
          <PreferenceRow icon={<span className="text-xs font-black">$</span>} label="Moneda">
            <span className="text-[13px] font-bold text-ink-secondary">COP</span>
          </PreferenceRow>
        </Card>

        <p className="mb-2 mt-6 px-1 text-[13px] font-bold text-ink">Cuenta</p>
        <Card className="divide-y divide-border">
          <NavRow icon={<Settings className="h-4 w-4" />} label="Configuración" onClick={() => navigate('/app/settings')} />
          <NavRow icon={<ShieldCheck className="h-4 w-4" />} label="Seguridad y privacidad" onClick={() => showToast('Próximamente', 'info')} />
        </Card>

        <Button variant="danger" fullWidth leftIcon={<LogOut className="h-4 w-4" />} className="mt-6" onClick={onLogout}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}

function PreferenceRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-primary">{icon}</span>
      <span className="flex-1 text-[13.5px] font-semibold text-ink">{label}</span>
      {children}
    </div>
  )
}

function NavRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-bg-secondary">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-primary">{icon}</span>
      <span className="flex-1 text-[13.5px] font-semibold text-ink">{label}</span>
      <ChevronRight className="h-4 w-4 text-ink-tertiary" />
    </button>
  )
}
