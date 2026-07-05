import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

interface OwnerRouteProps {
  children: React.ReactNode;
}

/**
 * Blindagem no frontend: só o owner (dono da plataforma) vê a tela de
 * Locais. Admin de local nem enxerga isso -- ele gerencia só o próprio
 * local em /users e /tvs. A garantia de verdade é o requireOwner no
 * backend; isso aqui é só esconder o que a pessoa não pode usar.
 */
export function OwnerRoute({ children }: OwnerRouteProps) {
  const { isAuthenticated, isOwner, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }
    if (!isOwner) {
      toast.error('Essa área é restrita ao dono da plataforma.');
      setLocation('/dashboard');
    }
  }, [isAuthenticated, isOwner, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated || !isOwner) {
    return null;
  }

  return <>{children}</>;
}
