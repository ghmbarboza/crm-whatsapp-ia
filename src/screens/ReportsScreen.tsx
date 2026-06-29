import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { exportLeadsCSV, exportAuditLogs } from '@/services/dashboardService'
import { PIPELINE_STAGES } from '@/utils/pipelineRules'

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportsScreen() {
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [etapa, setEtapa] = useState('')
  const [loading, setLoading] = useState(false)

  const handleExportLeads = async () => {
    setLoading(true)
    try {
      const csv = await exportLeadsCSV({ inicio: inicio || undefined, fim: fim || undefined })
      downloadFile(csv, `leads_${Date.now()}.csv`, 'text/csv')
      toast.success('Relatório exportado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar')
    } finally {
      setLoading(false)
    }
  }

  const handleExportLogs = async () => {
    setLoading(true)
    try {
      const csv = await exportAuditLogs({ inicio: inicio || undefined, fim: fim || undefined })
      downloadFile(typeof csv === 'string' ? csv : JSON.stringify(csv), `audit_logs_${Date.now()}.csv`, 'text/csv')
      toast.success('Logs exportados')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar logs')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Data Início</Label>
            <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div>
            <Label>Data Fim</Label>
            <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
          <div>
            <Label>Etapa Pipeline</Label>
            <Select value={etapa} onValueChange={setEtapa}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Exportar Leads (CSV)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              Exporta performance e pipeline de leads conforme filtros selecionados.
            </p>
            <Button onClick={handleExportLeads} disabled={loading}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exportar Logs LGPD (CSV)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              Histórico completo de auditoria para compliance LGPD.
            </p>
            <Button variant="secondary" onClick={handleExportLogs} disabled={loading}>
              <Download className="h-4 w-4" />
              Exportar Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
