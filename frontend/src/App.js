import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { API, axios } from './config';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Charts from './pages/Charts';
import Cards from './pages/Cards';
import Predictions from './pages/Predictions';
import AIAssistant from './pages/AIAssistant';
import BankImport from './pages/BankImport';
import NotificationBell from './components/NotificationBell';
import { LayoutDashboard, Receipt, Target, BarChart3, CreditCard, TrendingUp, Sparkles, Upload, Menu, X } from 'lucide-react';
import './App.css';

function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

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
              <span className="text-white font-heading font-bold text-lg">O</span>
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
            <NotificationBell />
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
          <div className="md:hidden py-4 space-y-2" data-testid="mobile-menu">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

function App() {
  useEffect(() => {
    const initializeData = async () => {
      try {
        const categoriesResponse = await axios.get(`${API}/categories`);
        if (categoriesResponse.data.length === 0) {
          const defaultCategories = [
            { name: 'Alimentação', color: '#EF4444' },
            { name: 'Transporte', color: '#F59E0B' },
            { name: 'Moradia', color: '#3B82F6' },
            { name: 'Lazer', color: '#8B5CF6' },
            { name: 'Saúde', color: '#10B981' },
            { name: 'Educação', color: '#06B6D4' },
            { name: 'Outros', color: '#6B7280' },
          ];
          
          for (const cat of defaultCategories) {
            await axios.post(`${API}/categories`, cat);
          }
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };

    initializeData();
  }, []);

  return (
    <div className="App min-h-screen bg-slate-50">
      <BrowserRouter>
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
          </Routes>
        </main>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;
