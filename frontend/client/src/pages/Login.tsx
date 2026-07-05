import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2, Zap } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-accent rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Grid pattern background */}
      <div className="absolute inset-0 opacity-5 bg-[linear-gradient(0deg,transparent_24%,rgba(0,217,255,.05)_25%,rgba(0,217,255,.05)_26%,transparent_27%,transparent_74%,rgba(0,217,255,.05)_75%,rgba(0,217,255,.05)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(0,217,255,.05)_25%,rgba(0,217,255,.05)_26%,transparent_27%,transparent_74%,rgba(0,217,255,.05)_75%,rgba(0,217,255,.05)_76%,transparent_77%,transparent)] bg-[length:50px_50px]" />

      <div className="relative w-full max-w-md z-10">
        {/* Logo e titulo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center text-background text-3xl font-bold shadow-2xl neon-glow">
              <Zap className="w-10 h-10" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-wider">
            Ward<span className="text-accent">Control</span>
          </h1>
          <p className="text-muted-foreground text-lg">Painel de Controle de TVs</p>
        </div>

        {/* Card de login */}
        <Card className="p-8 shadow-2xl border border-accent/30 bg-card/80 backdrop-blur-sm neon-border">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                className="mt-2 bg-secondary/50 border-accent/30 text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-accent/50 neon-border-hover"
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
                className="mt-2 bg-secondary/50 border-accent/30 text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-accent/50 neon-border-hover"
                required
              />
            </div>

            {/* Info box */}
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 flex gap-3 neon-border">
              <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80">
                Use suas credenciais para acessar o painel de controle
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 font-medium bg-gradient-to-r from-accent to-blue-600 hover:from-accent/80 hover:to-blue-600/80 text-background shadow-lg neon-glow-hover transition-all duration-300"
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
