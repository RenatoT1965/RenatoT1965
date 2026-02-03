import { useState, useEffect } from 'react';
import { API, axios, toast } from '../config';
import { TrendingUp, TrendingDown, Wallet, Plus, AlertCircle } from 'lucide-react';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import TransactionDialog from '../components/TransactionDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('expense');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/summary`);
      setSummary(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Erro ao carregar dashboard');
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const openDialog = (type) => {
    setDialogType(type);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Visão geral das suas finanças</p>
        </div>
        <div className="flex gap-2">
          <Button
            data-testid="quick-add-income-btn"
            onClick={() => openDialog('income')}
            className="bg-accent hover:bg-accent/90 text-white rounded-full px-6 py-6 font-medium shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Receita
          </Button>
          <Button
            data-testid="quick-add-expense-btn"
            onClick={() => openDialog('expense')}
            className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 py-6 font-medium shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Despesa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          data-testid="balance-card"
          className="bg-gradient-to-br from-primary to-accent p-6 rounded-2xl shadow-lg text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <Wallet className="w-8 h-8" />
          </div>
          <p className="text-sm opacity-90">Saldo Atual</p>
          <h2 className="text-3xl font-heading font-bold mt-2">{formatCurrency(summary?.balance || 0)}</h2>
        </div>

        <div
          data-testid="income-card"
          className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-2xl shadow-md border-2 border-emerald-200 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-sm text-slate-700 font-medium">Receitas do Mês</p>
          <h2 className="text-3xl font-heading font-bold mt-2 text-emerald-700">
            {formatCurrency(summary?.total_income || 0)}
          </h2>
        </div>

        <div
          data-testid="expenses-card"
          className="bg-gradient-to-br from-red-50 to-rose-50 p-6 rounded-2xl shadow-md border-2 border-red-200 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-sm text-slate-700 font-medium">Despesas do Mês</p>
          <h2 className="text-3xl font-heading font-bold mt-2 text-red-700">
            {formatCurrency(summary?.total_expenses || 0)}
          </h2>
        </div>
      </div>

      {summary?.budgets_status && summary.budgets_status.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
          <h2 className="text-2xl font-heading font-semibold mb-6">Progresso das Metas</h2>
          <div className="space-y-4">
            {summary.budgets_status.map((budget) => (
              <div key={budget.id} data-testid={`budget-progress-${budget.id}`}>
                {budget.exceeded && (
                  <div className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-destructive">Meta Ultrapassada!</p>
                      <p className="text-sm text-muted-foreground">{budget.name}</p>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{budget.name}</span>
                  <span className={`text-sm font-semibold ${
                    budget.exceeded ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
                  </span>
                </div>
                <Progress
                  value={Math.min(budget.percentage, 100)}
                  className="h-3"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(budget.percentage)}% utilizado
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary?.recent_transactions && summary.recent_transactions.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
          <h2 className="text-2xl font-heading font-semibold mb-6">Transações Recentes</h2>
          <div className="space-y-3">
            {summary.recent_transactions.map((transaction) => (
              <div
                key={transaction.id}
                data-testid={`recent-transaction-${transaction.id}`}
                className="flex items-center justify-between p-4 rounded-xl hover:bg-secondary transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(transaction.date), "d 'de' MMMM, yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className={`text-lg font-semibold ${
                  transaction.type === 'income' ? 'text-accent' : 'text-destructive'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={dialogType}
        onSuccess={loadDashboard}
      />
    </div>
  );
}
