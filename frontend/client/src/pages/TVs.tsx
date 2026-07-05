import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Search, Wifi, Zap, Power, Volume2, Home, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, MonitorPlay } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

interface TV {
  id: string;
  name: string;
  brand: string;
  ip: string;
  mac?: string;
  status: 'online' | 'offline' | 'unknown' | 'checking';
}

export default function TVs() {
  const { user } = useAuth();
  // Se veio por /locations/:locationId/tvs (o owner navegando um local
  // específico), usa esse. Senão, é um admin/user comum -- usa o local
  // dele mesmo, sem precisar escolher nada.
  const params = useParams<{ locationId?: string }>();
  const locationId = params.locationId || user?.locationId || '';

  const [tvs, setTvs] = useState<TV[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    brand: 'Samsung',
    ip: '',
    mac: '',
  });

  const loadTvs = useCallback(async () => {
    if (!locationId) return;
    try {
      setLoading(true);
      const response = await apiClient.listTvs(locationId);
      const list = (response as { tvs?: TV[] }).tvs || [];
      setTvs(list.map((tv) => ({ ...tv, status: (tv.status as TV['status']) || 'unknown' })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar TVs');
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    loadTvs();
    const interval = window.setInterval(() => {
      void loadTvs();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [loadTvs]);

  const filteredTvs = tvs.filter(
    (tv) =>
      tv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tv.ip.includes(searchTerm)
  );

  const handleAddTV = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.ip) {
      toast.error('Nome e IP sao obrigatorios');
      return;
    }

    try {
      await apiClient.addTv(locationId, {
        name: formData.name,
        brand: formData.brand,
        ip: formData.ip,
        mac: formData.mac,
      });
      setFormData({ name: '', brand: 'Samsung', ip: '', mac: '' });
      setIsDialogOpen(false);
      await loadTvs();
      toast.success('TV adicionada com sucesso!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar TV');
    }
  };

  const handleDeleteTV = async (id: string) => {
    try {
      await apiClient.deleteTv(locationId, id);
      setDeleteId(null);
      await loadTvs();
      toast.success('TV removida com sucesso!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover TV');
    }
  };

  const handleScanNetwork = async () => {
    try {
      const result = await apiClient.scanNetwork(locationId);
      const found = (result as { ips?: string[] }).ips || [];
      if (found.length === 0) {
        toast.success('Nenhuma TV encontrada na rede');
        return;
      }
      toast.success(`Encontradas ${found.length} TV(s) na rede`);
      if (found[0]) {
        setFormData((prev) => ({ ...prev, ip: found[0], name: `TV ${found[0].split('.').pop()}` }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao escanear rede');
    }
  };

  const handleCommand = async (id: string, action: 'power' | 'volume-up' | 'volume-down' | 'mute' | 'home' | 'back' | 'source' | 'up' | 'down' | 'left' | 'right' | 'enter') => {
    try {
      if (action === 'power') await apiClient.powerToggle(locationId, id);
      else if (action === 'volume-up') await apiClient.setVolume(locationId, id, 'up');
      else if (action === 'volume-down') await apiClient.setVolume(locationId, id, 'down');
      else if (action === 'mute') await apiClient.mute(locationId, id);
      else if (action === 'home') await apiClient.navigate(locationId, id, 'home');
      else if (action === 'back') await apiClient.navigate(locationId, id, 'back');
      else if (action === 'source') await apiClient.navigate(locationId, id, 'source');
      else if (action === 'up') await apiClient.navigate(locationId, id, 'up');
      else if (action === 'down') await apiClient.navigate(locationId, id, 'down');
      else if (action === 'left') await apiClient.navigate(locationId, id, 'left');
      else if (action === 'right') await apiClient.navigate(locationId, id, 'right');
      else if (action === 'enter') await apiClient.navigate(locationId, id, 'enter');
      toast.success('Comando enviado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar comando');
    }
  };

  if (!locationId) {
    return (
      <ProtectedRoute>
        <DashboardLayout activeNav="tvs">
          <Card className="p-12 text-center border-border/50 bg-secondary/30">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground font-medium">Nenhum local selecionado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Acesse pela tela de Locais e entre no local que você quer controlar.
            </p>
          </Card>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout activeNav="tvs">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Minhas TVs</h2>
              <p className="text-muted-foreground mt-1">
                Gerencie e controle suas TVs Samsung
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleScanNetwork}
                className="gap-2"
              >
                <Wifi className="w-4 h-4" />
                Escanear rede
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar TV
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Adicionar nova TV</DialogTitle>
                    <DialogDescription>
                      Preencha os dados da sua TV Samsung para adiciona-la ao
                      painel
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddTV} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome da TV</Label>
                      <Input
                        id="name"
                        placeholder="Ex: Sala de Estar"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="ip">Endereco IP</Label>
                      <Input
                        id="ip"
                        placeholder="Ex: 192.168.1.100"
                        value={formData.ip}
                        onChange={(e) =>
                          setFormData({ ...formData, ip: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="mac">Endereco MAC (opcional)</Label>
                      <Input
                        id="mac"
                        placeholder="Ex: 00:1A:2B:3C:4D:5E"
                        value={formData.mac}
                        onChange={(e) =>
                          setFormData({ ...formData, mac: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" className="flex-1">
                        Adicionar
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* TVs Grid */}
          {filteredTvs.length === 0 ? (
            <Card className="p-12 text-center border-border/50 bg-secondary/30">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground font-medium">
                {searchTerm ? 'Nenhuma TV encontrada' : 'Nenhuma TV cadastrada'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchTerm
                  ? 'Tente uma busca diferente'
                  : 'Comece adicionando uma TV'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTvs.map((tv) => (
                <Card
                  key={tv.id}
                  className="p-6 border-border/50 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {tv.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {tv.brand}
                      </p>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ml-2 ${
                        tv.status === 'online'
                          ? 'bg-green-500/10 text-green-700'
                          : tv.status === 'offline'
                            ? 'bg-red-500/10 text-red-700'
                            : tv.status === 'checking'
                              ? 'bg-amber-500/10 text-amber-700'
                              : 'bg-gray-500/10 text-gray-700'
                      }`}
                    >
                      {tv.status === 'online'
                        ? 'Online'
                        : tv.status === 'offline'
                          ? 'Offline'
                          : tv.status === 'checking'
                            ? 'Verificando'
                            : 'Desconhecido'}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 pb-4 border-b border-border/50">
                    <div>
                      <p className="text-xs text-muted-foreground">IP</p>
                      <p className="text-sm font-mono text-foreground">
                        {tv.ip}
                      </p>
                    </div>
                    {tv.mac && (
                      <div>
                        <p className="text-xs text-muted-foreground">MAC</p>
                        <p className="text-sm font-mono text-foreground">
                          {tv.mac}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Button size="sm" variant="outline" onClick={() => handleCommand(tv.id, 'power')} className="gap-1">
                      <Power className="w-3 h-3" /> Power
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleCommand(tv.id, 'volume-up')} className="gap-1">
                      <Volume2 className="w-3 h-3" /> Vol+
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleCommand(tv.id, 'home')} className="gap-1">
                      <Home className="w-3 h-3" /> Home
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <Button size="sm" variant="outline" onClick={() => handleCommand(tv.id, 'up')}><ArrowUp className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => handleCommand(tv.id, 'enter')}><MonitorPlay className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => handleCommand(tv.id, 'down')}><ArrowDown className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => handleCommand(tv.id, 'left')}><ArrowLeft className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => handleCommand(tv.id, 'back')}><ArrowLeft className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => handleCommand(tv.id, 'right')}><ArrowRight className="w-3 h-3" /></Button>
                  </div>
                  <div className="flex gap-2">
                    <AlertDialog>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(tv.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {deleteId === tv.id && (
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover TV?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover "{tv.name}"? Esta
                              acao nao pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="flex gap-2">
                            <AlertDialogCancel
                              onClick={() => setDeleteId(null)}
                            >
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteTV(tv.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      )}
                    </AlertDialog>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
