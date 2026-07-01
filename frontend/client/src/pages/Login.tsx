import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        await register(email, password, name);
        toast.success('Conta criada com sucesso!');
      } else {
        await login(email, password);
        toast.success('Login realizado com sucesso!');
      }
      setLocation('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao fazer login';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10 px-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle,_rgba(59,130,246,0.25)_0%,_transparent_60%)]" />

      <div className="relative w-full max-w-md">
        {/* Logo e titulo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
              TV
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">wardcontroll</h1>
          <p className="text-muted-foreground">
            {isSignUp ? 'Crie sua conta' : 'Faça login na sua conta'}
          </p>
        </div>

        {/* Card de login */}
        <Card className="p-8 shadow-lg border-border/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  Nome completo
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="mt-2"
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="mt-2"
                required
              />
              {!isSignUp && (
                <p className="text-xs text-muted-foreground mt-2">
                  Minimo 6 caracteres
                </p>
              )}
            </div>

            {/* Info box */}
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80">
                {isSignUp
                  ? 'Use um email e senha validos para criar sua conta'
                  : 'Use suas credenciais para acessar o painel de controle'}
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 font-medium"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSignUp ? 'Criar conta' : 'Entrar'}
            </Button>
          </form>

          {/* Toggle entre login e signup */}
          <div className="mt-6 pt-6 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Ja tem uma conta?' : 'Nao tem uma conta?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setEmail('');
                  setPassword('');
                  setName('');
                }}
                className="text-primary font-semibold hover:underline transition-colors"
              >
                {isSignUp ? 'Faca login' : 'Crie uma'}
              </button>
            </p>
          </div>
        </Card>

        {/* Footer info */}
        <p className="text-xs text-muted-foreground text-center mt-8">
          Seu painel seguro para controlar TVs Samsung
        </p>
      </div>
    </div>
  );
}
