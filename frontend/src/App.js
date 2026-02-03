import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Charts from './pages/Charts';
import Cards from './pages/Cards';
import Predictions from './pages/Predictions';
import AIAssistant from './pages/AIAssistant';
import BankImport from './pages/BankImport';
import Pricing from './pages/Pricing';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Onboarding from './pages/Onboarding';
import NotificationBell from './components/NotificationBell';
import PlanBadge from './components/PlanBadge';
import { LayoutDashboard, Receipt, Target, BarChart3, CreditCard, TrendingUp, Sparkles, Upload, Menu, X, User } from 'lucide-react';
import './App.css';

function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Lançamentos' },
    { path: '/import', icon: Upload, label: 'Importar' },
    { path: '/cards', icon: CreditCard, label: 'Cartões' },
    { path: '/budgets', icon: Target, label: 'Metas' },
    { path: '/predictions', icon: TrendingUp, label: 'Previsões' },
    { path: '/charts', icon: BarChart3, label: 'Gráficos' },
    { path: '/ai-assistant', icon: Sparkles, label: 'Assistente IA' },
  ];

  return (
    <nav className="bg-white border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-heading font-bold text-lg">F</span>
            </div>
            <h1 className="text-xl font-heading font-bold text-foreground">FinanceFlow</h1>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <PlanBadge />
            <NotificationBell />
            <Link
              to="/profile"
              data-testid="profile-link"
              className="flex items-center gap-2 px-3 py-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-sm font-medium">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </Link>
          </div>

          <button
            data-testid="mobile-menu-toggle"
            className="md:hidden p-2 rounded-lg hover:bg-secondary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/20 z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="md:hidden py-4 space-y-2 relative z-50 bg-white" data-testid="mobile-menu">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors relative z-50 ${
                    location.pathname === item.path
                      ? 'bg-primary text-primary-foreground'
                      : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-slate-200">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-700 hover:bg-slate-100"
                  data-testid="mobile-nav-profile"
                >
                  <User className="w-5 h-5" />
                  Meu Perfil
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Auth page doesn't need navigation
  if (location.pathname === '/auth') {
    return <Auth />;
  }

  // Onboarding page doesn't need navigation
  if (location.pathname === '/onboarding') {
    if (!isAuthenticated) {
      return <Navigate to="/auth" replace />;
    }
    return <Onboarding />;
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Check if onboarding is needed (only for new users)
  const onboardingCompleted = localStorage.getItem('onboarding_completed');
  if (!onboardingCompleted && location.pathname === '/') {
    // First time user - show onboarding
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="App min-h-screen bg-slate-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/import" element={<BankImport />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/charts" element={<Charts />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
        </Routes>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

// Auth page with redirect if already logged in
function AuthPage() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <Auth />;
}

export default App;
