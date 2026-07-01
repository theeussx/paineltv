import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Lock, Bell, Shield, Trash2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

export default function Settings() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    updates: true,
  });

  const handleLogout = () => {
    logout();
    setLocation('/login');
    toast.success('Desconectado com sucesso');
  };

  const handleDeleteAccount = () => {
    logout();
    setLocation('/login');
    toast.success('Conta deletada com sucesso');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Senha alterada com sucesso!');
  };

  return (
    <ProtectedRoute>
      <DashboardLayout activeNav="settings">
        <div className="space-y-6 max-w-2xl">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Configuracoes
            </h2>
            <p className="text-muted-foreground mt-1">
              Gerencie sua conta e preferencias
            </p>
          </div>

          {/* Perfil */}
          <Card className="p-6 border-border/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Perfil</h3>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Nome</Label>
                <Input
                  type="text"
                  value={user?.name || ''}
                  disabled
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Email</Label>
                <Input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="mt-1"
                />
              </div>

              <Button className="w-full">Editar Perfil</Button>
            </div>
          </Card>

          <Separator />

          {/* Seguranca */}
          <Card className="p-6 border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Seguranca</h3>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="current-password" className="text-sm font-medium">
                  Senha atual
                </Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="••••••••"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="new-password" className="text-sm font-medium">
                  Nova senha
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirm-password" className="text-sm font-medium">
                  Confirmar senha
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  className="mt-1"
                />
              </div>

              <Button type="submit" className="w-full">
                Alterar Senha
              </Button>
            </form>

            <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div className="text-sm text-foreground/80">
                  <p className="font-medium mb-1">Dica de seguranca:</p>
                  <p>
                    Use uma senha forte com letras maiusculas, minusculas,
                    numeros e caracteres especiais.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Separator />

          {/* Notificacoes */}
          <Card className="p-6 border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">
                Notificacoes
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">
                    Notificacoes por email
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Receba atualizacoes sobre suas TVs
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, email: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">
                    Notificacoes push
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Alertas em tempo real no seu navegador
                  </p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, push: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">
                    Atualizacoes de sistema
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Informacoes sobre novas funcionalidades
                  </p>
                </div>
                <Switch
                  checked={notifications.updates}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, updates: checked })
                  }
                />
              </div>

              <Button
                onClick={() => {
                  toast.success('Preferencias de notificacao salvas!');
                }}
                className="w-full"
              >
                Salvar Preferencias
              </Button>
            </div>
          </Card>

          <Separator />

          {/* Sessao */}
          <Card className="p-6 border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Sessao
            </h3>

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full gap-2 justify-center"
              >
                <LogOut className="w-4 h-4" />
                Sair de todas as sessoes
              </Button>
            </div>
          </Card>

          <Separator />

          {/* Zona de Perigo */}
          <Card className="p-6 border-destructive/20 bg-destructive/5">
            <h3 className="text-lg font-semibold text-destructive mb-4">
              Zona de Perigo
            </h3>

            <p className="text-sm text-foreground/70 mb-4">
              Estas acoes sao irreversiveis. Por favor, tenha cuidado.
            </p>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/20 hover:bg-destructive/10"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Deletar minha conta
              </Button>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deletar conta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acao nao pode ser desfeita. Todos os seus dados serao
                    permanentemente deletados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex gap-2">
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Deletar
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
