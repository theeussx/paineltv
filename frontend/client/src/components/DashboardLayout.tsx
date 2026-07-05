import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User, Menu, X, Zap } from 'lucide-react';
import { useState } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  activeNav?: string;
}

export function DashboardLayout({ children, activeNav }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  const navItems =
    user?.role === 'owner'
      ? [
          { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
          { id: 'locations', label: 'Locais', href: '/locations' },
          { id: 'settings', label: 'Configuracoes', href: '/settings' },
        ]
      : [
          { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
          { id: 'tvs', label: 'Minhas TVs', href: '/tvs' },
          ...(user?.role === 'admin'
            ? [{ id: 'users', label: 'Usuários', href: '/users' }]
            : []),
          { id: 'settings', label: 'Configuracoes', href: '/settings' },
        ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-out lg:relative lg:translate-x-0 z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full bg-gradient-to-b from-sidebar to-background">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center text-background font-bold text-sm shadow-lg neon-glow">
                <Zap className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-sidebar-foreground tracking-wider">
                wardcontroll
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setLocation(item.href);
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 ${
                  activeNav === item.id
                    ? 'bg-gradient-to-r from-accent/20 to-blue-600/20 text-accent font-medium border border-accent/50 shadow-md neon-glow'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-accent border border-transparent hover:border-accent/30'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-sidebar-border/50">
            <div className="text-sm text-sidebar-foreground/70 truncate font-mono">
              {user?.email}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-accent/20 h-16 flex items-center justify-between px-4 lg:px-6 shadow-md backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-secondary rounded-lg transition-all duration-300 text-accent hover:text-accent"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <h1 className="text-lg font-semibold text-foreground tracking-wide">
              {navItems.find((item) => item.id === activeNav)?.label || 'Dashboard'}
            </h1>
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 hover:bg-secondary/50 hover:text-accent transition-all duration-300"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-blue-600/30 flex items-center justify-center border border-accent/30">
                  <User className="w-4 h-4 text-accent" />
                </div>
                <span className="hidden sm:inline text-sm font-medium">
                  {user?.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-accent/30">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-accent/20" />
              <DropdownMenuItem 
                onClick={() => setLocation('/settings')}
                className="hover:bg-secondary/50 hover:text-accent transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configuracoes
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-accent/20" />
              <DropdownMenuItem 
                onClick={handleLogout} 
                className="text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 lg:hidden z-30 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
