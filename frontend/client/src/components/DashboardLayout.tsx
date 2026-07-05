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
import { LogOut, Settings, User, Menu, X, Tv } from 'lucide-react';
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
          { id: 'settings', label: 'Configurações', href: '/settings' },
        ]
      : [
          { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
          { id: 'tvs', label: 'Minhas TVs', href: '/tvs' },
          ...(user?.role === 'admin'
            ? [{ id: 'users', label: 'Usuários', href: '/users' }]
            : []),
          { id: 'settings', label: 'Configurações', href: '/settings' },
        ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-border transform transition-transform duration-300 ease-out lg:relative lg:translate-x-0 z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-subtle">
                <Tv className="w-5 h-5" />
              </div>
              <span className="font-semibold text-lg text-sidebar-foreground">
                wardcontroll
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setLocation(item.href);
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-md transition-all duration-200 text-sm font-medium ${
                  activeNav === item.id
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-sidebar-foreground hover:bg-secondary/40 border border-transparent'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-border">
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-4 lg:px-6 shadow-subtle">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-secondary rounded-md transition-colors text-foreground"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <h1 className="text-base font-semibold text-foreground">
              {navItems.find((item) => item.id === activeNav)?.label || 'Dashboard'}
            </h1>
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 hover:bg-secondary/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border">
                  <User className="w-4 h-4 text-foreground" />
                </div>
                <span className="hidden sm:inline text-sm font-medium text-foreground">
                  {user?.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-border">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                onClick={() => setLocation('/settings')}
                className="hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
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
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
