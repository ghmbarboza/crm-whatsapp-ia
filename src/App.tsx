import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { RoleGuard } from '@/components/layout/RoleGuard'
import { LoadingSpinner } from '@/components/ui/loading'
import { LoginPage } from '@/pages/LoginPage'
import { ResetPasswordPage } from '@/pages/__auth__/ResetPasswordPage'
import { NewPasswordPage } from '@/pages/__auth__/NewPasswordPage'
import { LeadsPipelinePage } from '@/pages/LeadsPipelinePage'
import { DashboardScreen } from '@/screens/DashboardScreen'
import { LeadsScreen } from '@/screens/LeadsScreen'
import { LeadDetailPage } from '@/pages/LeadDetailPage'
import { LiveChatPage } from '@/pages/LiveChatPage'
import { TeamManagementPage } from '@/pages/TeamManagementPage'
import { WhatsAppIntegrationConfigPage } from '@/pages/WhatsAppIntegrationConfigPage'
import { ClassificationAIConfigPage } from '@/pages/ClassificationAIConfigPage'
import { ReportsAndActivityHistoryPage } from '@/pages/ReportsAndActivityHistoryPage'
import { SystemSettingsAndTemplatesPage } from '@/pages/SystemSettingsAndTemplatesPage'
import { PerfilScreen } from '@/screens/PerfilScreen'
import { LogsScreen } from '@/screens/LogsScreen'
import { NotFoundScreen } from '@/screens/NotFoundScreen'
import { registerPushNotifications } from '@/utils/pushNotifications'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
  },
})

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner className="min-h-screen" />
  return <Navigate to={user ? '/dashboard' : '/login'} replace />
}

function AppRoutes() {
  useEffect(() => {
    registerPushNotifications()
  }, [])

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/reset" element={<ResetPasswordPage />} />
      <Route path="/redefinir-senha" element={<NewPasswordPage />} />
      <Route path="/auth" element={<Navigate to="/login" replace />} />
      <Route path="/cadastro" element={<Navigate to="/login" replace />} />
      <Route path="/recuperar-senha" element={<Navigate to="/auth/reset" replace />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardScreen />} />
        <Route path="/kanban" element={<LeadsPipelinePage />} />
        <Route path="/pipeline" element={<Navigate to="/kanban" replace />} />
        <Route path="/leads" element={<LeadsScreen />} />
        <Route path="/leads/:id" element={<LeadDetailPage />} />
        <Route path="/chat" element={<LiveChatPage />} />
        <Route path="/chat/:leadId" element={<LiveChatPage />} />
        <Route path="/perfil" element={<PerfilScreen />} />
        <Route
          path="/admin/team"
          element={
            <RoleGuard roles={['admin', 'gestor']}>
              <TeamManagementPage />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/integration-whatsapp"
          element={
            <RoleGuard roles={['admin', 'gestor']}>
              <WhatsAppIntegrationConfigPage />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/classification-ai"
          element={
            <RoleGuard roles={['admin']}>
              <ClassificationAIConfigPage />
            </RoleGuard>
          }
        />
        <Route path="/equipe" element={<Navigate to="/admin/team" replace />} />
        <Route
          path="/admin/reports"
          element={
            <RoleGuard roles={['admin', 'gestor']}>
              <ReportsAndActivityHistoryPage />
            </RoleGuard>
          }
        />
        <Route path="/relatorios" element={<Navigate to="/admin/reports" replace />} />
        <Route
          path="/admin/settings"
          element={
            <RoleGuard roles={['admin', 'gestor']}>
              <SystemSettingsAndTemplatesPage />
            </RoleGuard>
          }
        />
        <Route path="/configuracoes" element={<Navigate to="/admin/settings" replace />} />
        <Route
          path="/logs"
          element={
            <RoleGuard roles={['admin']}>
              <LogsScreen />
            </RoleGuard>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundScreen />} />
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
