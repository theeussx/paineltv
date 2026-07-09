import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AdminRoute } from '@/components/AdminRoute';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface LogEntry {
  id: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  tvName: string | null;
  ok: boolean;
  errorMessage: string | null;
  createdAt: string;
}

const PAGE_SIZE = 25;

export default function Logs() {
  const { user } = useAuth();
  const params = useParams<{ locationId?: string }>();
  const locationId = params.locationId || user?.locationId || '';

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'error'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    if (!locationId) return;
    setIsLoading(true);
    try {
      const data = await apiClient.listAuditLogs(locationId, {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        ok: statusFilter === 'all' ? undefined : statusFilter === 'ok',
      });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar logs');
    } finally {
      setIsLoading(false);
    }
  }, [locationId, page, statusFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const formatAction = (action: string) => {
    // Ações vêm como "tv.power.toggle", "tv.create" etc -- deixa mais legível.
    return action
      .replace(/^tv\./, '')
      .replace(/\./g, ' · ')
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  return (
    <AdminRoute>
      <DashboardLayout activeNav="logs">
        {!locationId ? (
          <div className="text-center py-16 text-muted-foreground">
            Nenhum local selecionado. Acesse pela tela de Locais.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Logs de auditoria</h2>
                <p className="text-muted-foreground mt-1">
                  Todo comando enviado por esse local fica registrado aqui — quem, quando, em qual TV, e se deu certo.
                </p>
              </div>

              <Select
                value={statusFilter}
                onValueChange={(v: 'all' | 'ok' | 'error') => {
                  setStatusFilter(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ok">Só sucesso</SelectItem>
                  <SelectItem value="error">Só erro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="border-border/50">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Spinner />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  Nenhum registro ainda.
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 flex items-start gap-3">
                      {log.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive mt-1 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">{formatAction(log.action)}</span>
                          {log.tvName && <Badge variant="secondary">{log.tvName}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {log.actorEmail} <span className="opacity-60">({log.actorRole})</span> ·{' '}
                          {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </p>
                        {!log.ok && log.errorMessage && (
                          <p className="text-sm text-destructive mt-1">{log.errorMessage}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Página {page + 1} de {totalPages} · {total} registros
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DashboardLayout>
    </AdminRoute>
  );
}
