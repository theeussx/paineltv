import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Blindagem no frontend: some com a tela pra quem nao e admin.
 * Isso e so UX (esconder o que a pessoa nao pode usar) -- a garantia
 * de verdade e a checagem de role no backend (requireAdmin), que
 * continua valendo mesmo se alguem tentar acessar a rota direto.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }
    if (!isAdmin) {
      toast.error('Essa área é restrita ao administrador.');
      setLocation('/dashboard');
    }
  }, [isAuthenticated, isAdmin, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
