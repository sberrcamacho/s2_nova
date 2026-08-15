import { useRoutes } from 'react-router-dom'
import { MobileFrame } from '@/mobile/MobileFrame'
import { mobileRoutes } from '@/mobile/routes'

// Mounted at "/app/*" behind React.lazy — nested useRoutes() resolves paths
// relative to that mount point, which is what keeps the mobile screen bundle
// out of the dashboard's initial load (and vice versa).
export default function MobileRoutes() {
  const element = useRoutes(mobileRoutes)
  return <MobileFrame>{element}</MobileFrame>
}
