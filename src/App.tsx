import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { RoleGuard } from '@/components/layout/RoleGuard'
import { LoginScreen } from '@/screens/LoginScreen'
import { DashboardScreen } from '@/screens/DashboardScreen'
import { PipelineScreen } from '@/screens/PipelineScreen'
import { LeadsScreen } from '@/screens/LeadsScreen'
import { ChatScreen } from '@/screens/ChatScreen'
import { ConfigScreen } from '@/screens/ConfigScreen'
import { ReportsScreen } from '@/screens/ReportsScreen'
import { registerPushNotifications } from '@/utils/pushNotifications'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
  },
})

function AppRoutes() {
  useEffect(() => {
    registerPushNotifications()
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardScreen />} />
        <Route path="/pipeline" element={<PipelineScreen />} />
        <Route path="/leads" element={<LeadsScreen />} />
        <Route path="/chat/:leadId" element={<ChatScreen />} />
        <Route
          path="/relatorios"
          element={
            <RoleGuard roles={['admin', 'gestor']}>
              <ReportsScreen />
            </RoleGuard>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <RoleGuard roles={['admin']}>
              <ConfigScreen />
            </RoleGuard>
          }
        />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster position="bottom-right" duration={3000} richColors />
      </AuthProvider>
    </QueryClientProvider>
  )
}
