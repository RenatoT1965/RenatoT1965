import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API, axios, toast } from '../config';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { 
  User, Mail, Crown, Zap, Calendar, CreditCard, 
  MessageSquare, FileText, LogOut, Settings, ChevronRight 
} from 'lucide-react';

export default function Profile() {
  const { user, logout, token } = useAuth();
  const [plan, setPlan] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const [planRes, transRes, cardsRes] = await Promise.all([
        axios.get(`${API}/plans/current`),
        axios.get(`${API}/transactions`),
        axios.get(`${API}/cards`)
      ]);

      setPlan(planRes.data);
      setStats({
        totalTransactions: transRes.data.length,
        totalCards: cardsRes.data.filter(c => c.active).length,
        totalIncome: transRes.data.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        totalExpenses: transRes.data.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
    toast.success('Até logo!');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getPlanInfo = () => {
    if (!plan) return { icon: null, label: '', color: '' };
    
    switch (plan.plan_type) {
      case 'premium':
        return { 
          icon: <Crown className="w-6 h-6" />, 
          label: 'Premium', 
          color: 'from-yellow-400 to-orange-500',
          textColor: 'text-orange-600'
        };
      case 'free_trial':
        return { 
          icon: <Zap className="w-6 h-6" />, 
          label: 'Teste Grátis', 
          color: 'from-blue-500 to-purple-500',
          textColor: 'text-blue-600'
        };
      default:
        return { 
          icon: <User className="w-6 h-6" />, 
          label: 'Básico', 
          color: 'from-slate-400 to-slate-500',
          textColor: 'text-slate-600'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const planInfo = getPlanInfo();
  const limits = plan?.limits || {};
  const usage = plan?.current_usage || {};

  return (
    <div className="space-y-6 max-w-4xl mx-auto" data-testid="profile-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground mt-2">Gerencie sua conta e assinatura</p>
        </div>
      </div>

      {/* User Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className={`bg-gradient-to-r ${planInfo.color} p-6 text-white`}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold">{user?.name || 'Usuário'}</h2>
              <div className="flex items-center gap-2 mt-1 opacity-90">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${planInfo.color} flex items-center justify-center text-white`}>
                {planInfo.icon}
              </div>
              <div>
                <p className="text-sm text-slate-500">Plano atual</p>
                <p className={`font-bold ${planInfo.textColor}`}>{planInfo.label}</p>
              </div>
            </div>
            {plan?.expires_at && (
              <div className="text-right">
                <p className="text-xs text-slate-500">Expira em</p>
                <p className="text-sm font-semibold text-slate-700">
                  {new Date(plan.expires_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>

          {plan?.plan_type !== 'premium' && (
            <Button
              onClick={() => navigate('/pricing')}
              className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white rounded-xl py-6"
              data-testid="upgrade-plan-btn"
            >
              <Crown className="w-5 h-5 mr-2" />
              Fazer Upgrade
            </Button>
          )}
        </div>
      </div>

      {/* Usage Stats */}
      {plan?.plan_type !== 'premium' && (
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <h3 className="text-xl font-heading font-semibold mb-4">Uso do Plano</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Transações
                </span>
                <span className="text-slate-600">
                  {usage.transactions || 0} / {limits.transactions_per_month === -1 ? '∞' : limits.transactions_per_month}
                </span>
              </div>
              {limits.transactions_per_month !== -1 && (
                <Progress 
                  value={Math.min((usage.transactions || 0) / limits.transactions_per_month * 100, 100)} 
                  className="h-2" 
                />
              )}
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  Mensagens IA
                </span>
                <span className="text-slate-600">
                  {usage.ai_messages || 0} / {limits.ai_messages_per_month === -1 ? '∞' : limits.ai_messages_per_month}
                </span>
              </div>
              {limits.ai_messages_per_month !== -1 && (
                <Progress 
                  value={Math.min((usage.ai_messages || 0) / limits.ai_messages_per_month * 100, 100)} 
                  className="h-2" 
                />
              )}
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  Cartões
                </span>
                <span className="text-slate-600">
                  {usage.cards || 0} / {limits.max_cards === -1 ? '∞' : limits.max_cards}
                </span>
              </div>
              {limits.max_cards !== -1 && (
                <Progress 
                  value={Math.min((usage.cards || 0) / limits.max_cards * 100, 100)} 
                  className="h-2" 
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-border">
          <p className="text-xs text-slate-500 mb-1">Total Transações</p>
          <p className="text-2xl font-bold text-slate-800">{stats?.totalTransactions || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-border">
          <p className="text-xs text-slate-500 mb-1">Cartões Ativos</p>
          <p className="text-2xl font-bold text-slate-800">{stats?.totalCards || 0}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
          <p className="text-xs text-emerald-600 mb-1">Total Receitas</p>
          <p className="text-xl font-bold text-emerald-700">{formatCurrency(stats?.totalIncome || 0)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <p className="text-xs text-red-600 mb-1">Total Despesas</p>
          <p className="text-xl font-bold text-red-700">{formatCurrency(stats?.totalExpenses || 0)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-border divide-y divide-border">
        <button
          onClick={() => navigate('/profile/edit')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          data-testid="edit-profile-btn"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-medium">Editar Perfil</p>
              <p className="text-sm text-slate-500">Alterar nome e senha</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>

        <button
          onClick={() => navigate('/pricing')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          data-testid="manage-subscription-btn"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium">Gerenciar Assinatura</p>
              <p className="text-sm text-slate-500">Ver planos e fazer upgrade</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors text-red-600"
          data-testid="logout-btn"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-medium">Sair da Conta</p>
              <p className="text-sm text-red-400">Encerrar sessão</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Account Info */}
      <div className="text-center text-sm text-slate-400 py-4">
        <p>Membro desde {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'hoje'}</p>
        <p className="mt-1">ID: {user?.id?.slice(0, 8)}...</p>
      </div>
    </div>
  );
}
