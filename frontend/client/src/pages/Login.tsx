import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2, Tv } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Login realizado com sucesso!');
      setLocation('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao fazer login';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo e titulo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-subtle">
              <Tv className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Ward<span className="text-accent">Control</span>
          </h1>
          <p className="text-muted-foreground">Painel de Controle de TVs</p>
        </div>

        {/* Card de login */}
        <Card className="p-8 shadow-subtle border-border">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="mt-2 bg-secondary/30 border-border text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-accent/50"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="mt-2 bg-secondary/30 border-border text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-accent/50"
                required
              />
            </div>

            {/* Info box */}
            <div className="bg-accent/5 border border-accent/20 rounded-md p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80">
                Use suas credenciais para acessar o painel
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-subtle transition-all"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Entrar
            </Button>
          </form>
        </Card>

        {/* Footer info */}
        <p className="text-xs text-muted-foreground text-center mt-8">
          © 2026 Ward Control. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
