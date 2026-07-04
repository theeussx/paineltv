import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AdminRoute } from '@/components/AdminRoute';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { validatePassword, isValidEmail } from '@/lib/security';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserPlus, Trash2, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin',
  });

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.listUsers();
      setUsers(data.users || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar usuários';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const resetForm = () => setForm({ name: '', email: '', password: '', role: 'user' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || form.name.trim().length < 2) {
      toast.error('Informe um nome válido.');
      return;
    }
    if (!isValidEmail(form.email)) {
      toast.error('Informe um email válido.');
      return;
    }
    const passwordCheck = validatePassword(form.password);
    if (!passwordCheck.isValid) {
      toast.error(passwordCheck.errors[0]);
      return;
    }

    setIsCreating(true);
    try {
      await apiClient.createUser(form);
      toast.success(`Usuário ${form.email} criado com sucesso.`);
      setIsCreateOpen(false);
      resetForm();
      loadUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar usuário';
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.deleteUser(userToDelete.id);
      toast.success(`Usuário ${userToDelete.email} removido.`);
      setUserToDelete(null);
      loadUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao remover usuário';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminRoute>
      <DashboardLayout activeNav="users">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Usuários</h2>
              <p className="text-muted-foreground mt-1">
                Só administradores podem criar ou remover contas. Novos usuários
                entram sempre como "user", a menos que você marque "admin".
              </p>
            </div>

            <Dialog
              open={isCreateOpen}
              onOpenChange={(open) => {
                setIsCreateOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Novo usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar novo usuário</DialogTitle>
                  <DialogDescription>
                    A pessoa vai usar este email e senha para entrar no painel.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <Label htmlFor="new-name">Nome</Label>
                    <Input
                      id="new-name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Nome completo"
                      disabled={isCreating}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="new-email">Email</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="pessoa@exemplo.com"
                      disabled={isCreating}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="new-password">Senha</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      disabled={isCreating}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      8+ caracteres, com maiúscula, minúscula, número e símbolo.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="new-role">Permissão</Label>
                    <Select
                      value={form.role}
                      onValueChange={(value: 'user' | 'admin') => setForm({ ...form, role: value })}
                    >
                      <SelectTrigger id="new-role" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário comum</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={isCreating} className="w-full gap-2">
                      {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                      Criar usuário
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabela de usuários */}
          <Card className="border-border/50">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                Nenhum usuário cadastrado ainda.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Permissão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        {u.role === 'admin' ? (
                          <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                            <ShieldCheck className="w-3 h-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Usuário</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={u.id === currentUser?.id}
                          title={
                            u.id === currentUser?.id
                              ? 'Você não pode remover a própria conta'
                              : 'Remover usuário'
                          }
                          onClick={() => setUserToDelete(u)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>

        {/* Confirmacao de remocao */}
        <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
              <AlertDialogDescription>
                {userToDelete && (
                  <>
                    <strong>{userToDelete.name}</strong> ({userToDelete.email}) vai perder
                    o acesso ao painel imediatamente. Essa ação não pode ser desfeita.
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
    </AdminRoute>
  );
}
