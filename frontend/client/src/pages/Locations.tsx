import { useEffect, useState, useCallback } from 'react';
import { Link } from 'wouter';
import { DashboardLayout } from '@/components/DashboardLayout';
import { OwnerRoute } from '@/components/OwnerRoute';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Plus, Trash2, RefreshCw, Copy, Check, MonitorPlay, Users as UsersIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Location {
  id: string;
  name: string;
  createdAt: string;
  online: boolean;
}

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Guarda o token recém-gerado (criação ou rotação) pra mostrar UMA vez.
  const [revealedToken, setRevealedToken] = useState<{ locationName: string; token: string } | null>(null);

  const loadLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.listLocations();
      setLocations(data.locations || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar locais');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
    // Reconsulta o status online periodicamente -- o agente pode cair/subir
    // a qualquer momento, sem o owner fazer nada.
    const interval = window.setInterval(() => void loadLocations(), 15000);
    return () => window.clearInterval(interval);
  }, [loadLocations]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      toast.error('Informe um nome válido pro local.');
      return;
    }
    setIsCreating(true);
    try {
      const result = await apiClient.createLocation(name);
      setIsCreateOpen(false);
      setName('');
      await loadLocations();
      setRevealedToken({ locationName: result.location.name, token: result.token });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar local');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRotate = async (location: Location) => {
    try {
      const result = await apiClient.rotateLocationToken(location.id);
      setRevealedToken({ locationName: location.name, token: result.token });
      toast.success('Token rotacionado. O agente antigo vai precisar do novo token pra reconectar.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao rotacionar token');
    }
  };

  const handleDelete = async () => {
    if (!locationToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.deleteLocation(locationToDelete.id);
      toast.success(`Local "${locationToDelete.name}" removido.`);
      setLocationToDelete(null);
      loadLocations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover local');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToken = async () => {
    if (!revealedToken) return;
    await navigator.clipboard.writeText(revealedToken.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <OwnerRoute>
      <DashboardLayout activeNav="locations">
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Locais</h2>
              <p className="text-muted-foreground mt-1">
                Cada local roda um agente perto das próprias TVs. Crie o local aqui,
                copie o token e cole no <code className="text-xs bg-secondary/50 px-1 py-0.5 rounded">.env</code> do
                agente daquele lugar.
              </p>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo local
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar novo local</DialogTitle>
                  <DialogDescription>
                    Depois de criar, você recebe um token — cole ele no agente que vai
                    rodar perto das TVs desse local.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <Label htmlFor="loc-name">Nome do local</Label>
                    <Input
                      id="loc-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Loja Centro"
                      disabled={isCreating}
                      className="mt-1"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isCreating} className="w-full gap-2">
                      {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                      Criar local
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-border/50">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner />
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                Nenhum local cadastrado ainda.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {locations.map((loc) => (
                  <div key={loc.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${loc.online ? 'bg-green-500' : 'bg-gray-400'}`}
                        title={loc.online ? 'Agente conectado' : 'Agente offline'}
                      />
                      <div>
                        <p className="font-medium text-foreground">{loc.name}</p>
                        <Badge variant={loc.online ? 'default' : 'secondary'} className="mt-0.5">
                          {loc.online ? 'Online' : 'Offline'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/locations/${loc.id}/tvs`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <MonitorPlay className="w-3.5 h-3.5" />
                          TVs
                        </Button>
                      </Link>
                      <Link href={`/locations/${loc.id}/users`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <UsersIcon className="w-3.5 h-3.5" />
                          Usuários
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRotate(loc)}
                        title="Gerar um novo token (invalida o atual)"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocationToDelete(loc)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Modal de token -- só aparece uma vez, na criação ou rotação */}
        <Dialog open={!!revealedToken} onOpenChange={(open) => !open && setRevealedToken(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Token do local "{revealedToken?.locationName}"</DialogTitle>
              <DialogDescription>
                Copie agora — por segurança, esse token não fica visível de novo depois
                que você fechar esta janela. Cole no <code className="text-xs bg-secondary/50 px-1 py-0.5 rounded">SITE_TOKEN</code> do
                <code className="text-xs bg-secondary/50 px-1 py-0.5 rounded"> .env</code> do agente.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-secondary/50 p-3 rounded break-all">
                {revealedToken?.token}
              </code>
              <Button variant="outline" size="sm" onClick={copyToken} className="gap-1 shrink-0">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirmação de remoção */}
        <AlertDialog open={!!locationToDelete} onOpenChange={(open) => !open && setLocationToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover local?</AlertDialogTitle>
              <AlertDialogDescription>
                {locationToDelete && (
                  <>
                    O agente de <strong>{locationToDelete.name}</strong> vai parar de
                    conseguir se conectar, e os usuários desse local perdem acesso. As
                    TVs cadastradas no agente continuam lá localmente, mas ninguém mais
                    controla por aqui. Essa ação não pode ser desfeita.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2">
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Remover
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardLayout>
    </OwnerRoute>
  );
}
