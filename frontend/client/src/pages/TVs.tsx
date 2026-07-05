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
  status: 'online' | 'offline' | 'desconhecido' | 'checando';
}

export default function TVs() {
  const { user } = useAuth();
  const params = useParams<{ locationId?: string }>();
  const locationId = params.locationId || user?.locationId || '';

  const [tvs, setTvs] = useState<TV[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    brand: 'Marca',
    ip: '',
    mac: '',
  });

  const loadTvs = useCallback(async () => {
    if (!locationId) return;
    try {
      setLoading(true);
      const response = await apiClient.listTvs(locationId);
      const list = (response as { tvs?: TV[] }).tvs || [];
      setTvs(list.map((tv) => ({ ...tv, status: (tv.status as TV['status']) || 'desconhecido' })));
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
      setFormData({ name: '', brand: 'Marca', ip: '', mac: '' });
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

  const handleCommand = async (id: string, action: 'power' | 'volume +' | 'volume -' | 'mute' | 'home' | 'voltar' | 'source' | 'cima' | 'baixo' | 'esquerda' | 'direita' | 'enter') => {
    try {
      if (action === 'power') await apiClient.powerToggle(locationId, id);
      else if (action === 'volume +') await apiClient.setVolume(locationId, id, 'up');
      else if (action === 'volume -') await apiClient.setVolume(locationId, id, 'down');
      else if (action === 'mute') await apiClient.mute(locationId, id);
      else if (action === 'home') await apiClient.navigate(locationId, id, 'home');
      else if (action === 'voltar') await apiClient.navigate(locationId, id, 'back');
      else if (action === 'source') await apiClient.navigate(locationId, id, 'source');
      else if (action === 'cima') await apiClient.navigate(locationId, id, 'up');
      else if (action === 'baixo') await apiClient.navigate(locationId, id, 'down');
      else if (action === 'esquerda') await apiClient.navigate(locationId, id, 'left');
      else if (action === 'direita') await apiClient.navigate(locationId, id, 'right');
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
          <Card className="p-12 text-center border-accent/30 bg-gradient-to-br from-secondary/30 to-secondary/10 neon-border">
            <Zap className="w-12 h-12 text-accent mx-auto mb-4" />
            <p className="text-muted-foreground font-medium text-lg">Nenhum local selecionado</p>
            <p className="text-sm text-muted-foreground mt-2">
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
              <h2 className="text-3xl font-bold text-foreground tracking-wide">Minhas TVs</h2>
              <p className="text-muted-foreground mt-2">
                Gerencie e controle suas TVs
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleScanNetwork}
                className="gap-2 border-accent/30 hover:bg-accent/20 hover:text-accent transition-all duration-300"
              >
                <Wifi className="w-4 h-4" />
                Escanear rede
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-gradient-to-r from-accent to-blue-600 hover:from-accent/80 hover:to-blue-600/80 text-background shadow-lg neon-glow-hover">
                    <Plus className="w-4 h-4" />
                    Adicionar TV
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md border-accent/30 bg-card/80 backdrop-blur-sm neon-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Adicionar nova TV</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Preencha os dados da sua TV para adiciona-la ao painel
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddTV} className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-foreground">Nome da TV</Label>
                      <Input
                        id="name"
                        placeholder="Ex: Sala de Estar"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="mt-1 bg-secondary/50 border-accent/30 text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-accent/50 neon-border-hover"
                      />
                    </div>

                    <div>
                      <Label htmlFor="ip" className="text-foreground">Endereco IP</Label>
                      <Input
                        id="ip"
                        placeholder="Ex: 192.168.1.100"
                        value={formData.ip}
                        onChange={(e) =>
                          setFormData({ ...formData, ip: e.target.value })
                        }
                        className="mt-1 bg-secondary/50 border-accent/30 text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-accent/50 neon-border-hover"
                      />
                    </div>

                    <div>
                      <Label htmlFor="mac" className="text-foreground">Endereco MAC (opcional)</Label>
                      <Input
                        id="mac"
                        placeholder="Ex: 00:1A:2B:3C:4D:5E"
                        value={formData.mac}
                        onChange={(e) =>
                          setFormData({ ...formData, mac: e.target.value })
                        }
                        className="mt-1 bg-secondary/50 border-accent/30 text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-accent/50 neon-border-hover"
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        className="flex-1 border-accent/30 hover:bg-accent/20 hover:text-accent transition-all duration-300"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 bg-gradient-to-r from-accent to-blue-600 hover:from-accent/80 hover:to-blue-600/80 text-background shadow-lg neon-glow-hover"
                      >
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
              className="pl-10 bg-secondary/50 border-accent/30 text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-accent/50 neon-border-hover"
            />
          </div>

          {/* TVs Grid */}
          {filteredTvs.length === 0 ? (
            <Card className="p-12 text-center border-accent/30 bg-gradient-to-br from-secondary/30 to-secondary/10 neon-border">
              <Zap className="w-12 h-12 text-accent mx-auto mb-4" />
              <p className="text-muted-foreground font-medium text-lg">
                {searchTerm ? 'Nenhuma TV encontrada' : 'Nenhuma TV cadastrada'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
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
                  className="p-6 border-accent/30 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-secondary/50 to-secondary/20 neon-border neon-glow-hover"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg">
                        {tv.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {tv.brand}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 border ${
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

                  <div className="space-y-2 mb-4 pb-4 border-b border-accent/20">
                    <div>
                      <p className="text-xs text-muted-foreground font-mono">IP</p>
                      <p className="text-sm font-mono text-accent">
                        {tv.ip}
                      </p>
                    </div>
                    {tv.mac && (
                      <div>
                        <p className="text-xs text-muted-foreground font-mono">MAC</p>
                        <p className="text-sm font-mono text-accent">
                          {tv.mac}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleCommand(tv.id, 'power')} 
                      className="gap-1 border-accent/30 hover:bg-accent/20 hover:text-accent transition-all duration-300"
                    >
                      <Power className="w-3 h-3" /> Power
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleCommand(tv.id, 'volume +')} 
                      className="gap-1 border-accent/30 hover:bg-accent/20 hover:text-accent transition-all duration-300"
                    >
                      <Volume2 className="w-3 h-3" /> Vol+
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleCommand(tv.id, 'home')} 
                      className="gap-1 border-accent/30 hover:bg-accent/20 hover:text-accent transition-all duration-300"
                    >
                      <Home className="w-3 h-3" /> Home
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleCommand(tv.id, 'cima')}
                      className="border-accent/30 hover:bg-accent/20 hover:text-accent transition-all duration-300"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleCommand(tv.id, 'enter')}
                      className="border-accent/30 hover:bg-accent/20 hover:text-accent transition-all duration-300"
                    >
                      <MonitorPlay className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleCommand(tv.id, 'baixo')}
                      className="border-accent/30 hover:bg-accent/20 hover:text-accent transition-all duration-300"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleCommand(tv.id, 'esquerda')}
                      className="border-accent/30 hover:bg-accent/20 hover:text-accent transition-all duration-300"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleCommand(tv.id, 'voltar')}
                      className="border-accent/30 hover:bg-accent/20 hover:text-accent transition-all duration-300"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleCommand(tv.id, 'direita')}
                      className="border-accent/30 hover:bg-accent/20 hover:text-accent transition-all duration-300"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <AlertDialog>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/20 border-destructive/30 transition-all duration-300"
                        onClick={() => setDeleteId(tv.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {deleteId === tv.id && (
                        <AlertDialogContent className="border-accent/30 bg-card/80 backdrop-blur-sm neon-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">Remover TV?</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              Tem certeza que deseja remover "{tv.name}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="flex gap-2">
                            <AlertDialogCancel
                              onClick={() => setDeleteId(null)}
                              className="border-accent/30 hover:bg-accent/20 hover:text-accent transition-all duration-300"
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
