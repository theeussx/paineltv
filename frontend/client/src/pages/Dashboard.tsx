import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { apiClient } from '@/lib/api-client';
import { Link } from 'wouter';
import {
  Tv,
  Plus,
  Wifi,
  Power,
  AlertCircle,
  TrendingUp,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';

interface TV {
  id: string;
  name: string;
  brand: string;
  ip: string;
  status: 'online' | 'offline' | 'desconhecido' | 'checando';
}

export default function Dashboard() {
  const { user } = useAuth();
  const locationId = user?.locationId || '';
  const [tvs, setTvs] = useState<TV[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTvs = useCallback(async () => {
    if (!locationId) return;
    try {
      setIsLoading(true);
      const response = await apiClient.listTvs(locationId);
      const list = (response as { tvs?: TV[] }).tvs || [];
      setTvs(list.map((tv) => ({ ...tv, status: (tv.status as TV['status']) || 'desconhecido' })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar TVs');
    } finally {
      setIsLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    void loadTvs();
    const interval = window.setInterval(() => {
      void loadTvs();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [loadTvs]);

  const handleAddTV = () => {
    toast.info('Navegue para "Minhas TVs" para adicionar uma nova TV');
  };

  const handlePowerToggle = async (tvId: string) => {
    try {
      await apiClient.powerToggle(locationId, tvId);
      toast.success('Comando enviado para a TV');
      await loadTvs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar comando');
    }
  };

  const onlineCount = tvs.filter((tv) => tv.status === 'online').length;
  const totalCount = tvs.length;

  if (user?.role === 'owner') {
    return (
      <ProtectedRoute>
        <DashboardLayout activeNav="dashboard">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-foreground tracking-wide">Bem-vindo de volta!</h2>
              <p className="text-muted-foreground mt-2">
                Gerencie os locais, usuários e TVs que rodam nesta plataforma.
              </p>
            </div>
            <Card className="p-12 text-center border-accent/30 bg-gradient-to-br from-secondary/30 to-secondary/10 neon-border">
              <Building2 className="w-12 h-12 text-accent mx-auto mb-4" />
              <p className="text-muted-foreground font-medium text-lg">
                Acesse "Locais" para criar um local, ver quais estão online e gerenciar TVs e usuários de cada um.
              </p>
              <Link href="/locations">
                <Button className="mt-6 bg-gradient-to-r from-accent to-blue-600 hover:from-accent/80 hover:to-blue-600/80 text-background shadow-lg neon-glow-hover">
                  Ver locais
                </Button>
              </Link>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout activeNav="dashboard">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground tracking-wide">
                Bem-vindo de volta!
              </h2>
              <p className="text-muted-foreground mt-2">
                Aqui está um resumo do seu local e das TVs que estão disponíveis para controle.
              </p>
            </div>
            <Button 
              onClick={handleAddTV} 
              className="gap-2 bg-gradient-to-r from-accent to-blue-600 hover:from-accent/80 hover:to-blue-600/80 text-background shadow-lg neon-glow-hover"
            >
              <Plus className="w-4 h-4" />
              Adicionar TV
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-6 border-accent/30 shadow-lg bg-gradient-to-br from-secondary/50 to-secondary/20 neon-border neon-glow-hover">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Total de TVs
                  </p>
                  <p className="text-4xl font-bold text-accent mt-2">
                    {totalCount}
                  </p>
                </div>
                <div className="p-3 bg-accent/20 rounded-lg border border-accent/30 neon-glow">
                  <Tv className="w-6 h-6 text-accent" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-accent/30 shadow-lg bg-gradient-to-br from-secondary/50 to-secondary/20 neon-border neon-glow-hover">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Online
                  </p>
                  <p className="text-4xl font-bold text-accent mt-2">
                    {onlineCount}
                  </p>
                </div>
                <div className="p-3 bg-accent/20 rounded-lg border border-accent/30 neon-glow">
                  <Wifi className="w-6 h-6 text-accent" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-green-500/30 shadow-lg bg-gradient-to-br from-green-500/10 to-green-500/5 neon-border neon-glow-hover">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Ativas
                  </p>
                  <p className="text-4xl font-bold text-green-500 mt-2">
                    {tvs.filter((tv) => tv.status === 'online').length}
                  </p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                  <Power className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </Card>
          </div>

          {/* TVs List */}
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4 tracking-wide">
              Suas TVs
            </h3>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : tvs.length === 0 ? (
              <Card className="p-12 text-center border-accent/30 bg-gradient-to-br from-secondary/30 to-secondary/10 neon-border">
                <AlertCircle className="w-12 h-12 text-accent mx-auto mb-4" />
                <p className="text-muted-foreground font-medium text-lg">
                  Nenhuma TV cadastrada
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Comece adicionando uma TV para controlar
                </p>
                <Button 
                  onClick={handleAddTV} 
                  className="mt-6 bg-gradient-to-r from-accent to-blue-600 hover:from-accent/80 hover:to-blue-600/80 text-background shadow-lg neon-glow-hover"
                >
                  Adicionar primeira TV
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tvs.map((tv) => (
                  <Card
                    key={tv.id}
                    className="p-6 border-accent/30 hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-secondary/50 to-secondary/20 neon-border neon-glow-hover"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-foreground text-lg">
                          {tv.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {tv.brand}
                        </p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          tv.status === 'online'
                            ? 'bg-green-500/20 text-green-400 border-green-500/50'
                            : tv.status === 'offline'
                              ? 'bg-red-500/20 text-red-400 border-red-500/50'
                              : tv.status === 'checando'
                                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                                : 'bg-gray-500/20 text-gray-400 border-gray-500/50'
                        }`}
                      >
                        {tv.status === 'online'
                          ? 'Online'
                          : tv.status === 'offline'
                            ? 'Offline'
                            : tv.status === 'checando'
                              ? 'Verificando'
                              : 'Desconhecido'}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground font-mono">IP</p>
                        <p className="text-sm font-mono text-accent">
                          {tv.ip}
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-accent/30 hover:bg-accent/20 hover:text-accent transition-all duration-300"
                          onClick={() => handlePowerToggle(tv.id)}
                        >
                          <Power className="w-3 h-3 mr-1" />
                          Toggle
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-accent/30 hover:bg-accent/20 hover:text-accent transition-all duration-300"
                        >
                          Controlar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          {tvs.length > 0 && (
            <Card className="p-6 border-accent/30 bg-gradient-to-r from-accent/10 to-blue-600/10 neon-border">
              <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Ações Rápidas
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Controle múltiplas TVs simultaneamente
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-accent/30 hover:bg-accent/20 hover:text-accent transition-all duration-300"
                    onClick={() => toast.success('Todas as TVs foram ligadas')}
                  >
                    Ligar todas
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-accent/30 hover:bg-accent/20 hover:text-accent transition-all duration-300"
                    onClick={() => toast.success('Todas as TVs foram desligadas')}
                  >
                    Desligar todas
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
