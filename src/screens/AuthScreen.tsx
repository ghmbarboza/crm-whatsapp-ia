import { Navigate, useSearchParams } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/loading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoginScreen } from '@/screens/LoginScreen'
import { SignupScreen } from '@/screens/SignupScreen'
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen'

export function AuthScreen() {
  const { user, loading } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'login'

  if (loading) return <LoadingSpinner className="min-h-screen" />
  if (user) return <Navigate to="/dashboard" replace />

  const setTab = (value: string) => setParams({ tab: value })

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-2 flex justify-center">
            <MessageCircle className="h-10 w-10 text-[#0D4F8B]" />
          </div>
          <h1 className="text-3xl font-bold text-[#0D4F8B]">CRM Automatizado com IA</h1>
          <p className="mt-1 text-sm text-gray-500">Gestão de vendas integrada ao WhatsApp</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="cadastro">Registro</TabsTrigger>
            <TabsTrigger value="recuperar">Recuperar</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="mt-4">
            <LoginScreen embedded />
          </TabsContent>
          <TabsContent value="cadastro" className="mt-4">
            <SignupScreen embedded />
          </TabsContent>
          <TabsContent value="recuperar" className="mt-4">
            <ForgotPasswordScreen embedded />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
