import type { User } from '@/types'

export const mockUser: User = {
  id: 'usr_001',
  name: 'Mariana Torres',
  email: 'mariana.torres@example.com',
  phone: '+57 300 555 1234',
  city: 'Bogotá, D.C.',
  avatarInitials: 'MT',
  currency: 'COP',
  memberSince: '2024-11-02',
  preferences: {
    theme: 'system',
    notifications: true,
    biometricLogin: false,
    language: 'es',
  },
}

// Demo credentials shown on the login screen — this is a mock auth service,
// not a real backend, so any password works as long as the email matches.
export const demoCredentials = {
  email: mockUser.email,
  password: 'nova2026',
}
