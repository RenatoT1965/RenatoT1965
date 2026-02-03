import { useState, useEffect } from 'react';
import { API, axios, toast } from '../config';
import { Button } from '../components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import BudgetDialog from '../components/BudgetDialog';
import { Progress } from '../components/ui/progress';

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [budgetsStatus, setBudgetsStatus] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [budgetsResponse, categoriesResponse] = await Promise.all([
        axios.get(`${API}/budgets`),
        axios.get(`${API}/categories`),
      ]);
      setBudgets(budgetsResponse.data);
      setCategories(categoriesResponse.data);

      const statusPromises = budgetsResponse.data.map(b => 
        axios.get(`${API}/budgets/${b.id}/status`)
      );
      const statusResults = await Promise.all(statusPromises);
      const statusMap = {};
      statusResults.forEach(res => {
        statusMap[res.data.budget_id] = res.data;
      });
      setBudgetsStatus(statusMap);

      setLoading(false);
    } catch (error) {
      console.error('Error loading budgets:', error);
      toast.error('Erro ao carregar metas');
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta meta?')) return;

    try {
      await axios.delete(`${API}/budgets/${id}`);
      toast.success('Meta excluída com sucesso');
      loadData();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast.error('Erro ao excluir meta');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'N/A';
  };

  const periodLabels = {
    weekly: 'Semanal',
    monthly: 'Mensal',
    custom_range: 'Período Customizado',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="budgets-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">Metas</h1>
          <p className="text-muted-foreground mt-2">Defina e acompanhe suas metas de gastos</p>
        </div>
        <Button
          data-testid="add-budget-btn"
          onClick={() => {
            setEditingBudget(null);
            setDialogOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 py-6 font-medium shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      {budgets.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-border text-center">
          <p className="text-muted-foreground">Nenhuma meta cadastrada</p>
          <Button
            onClick={() => setDialogOpen(true)}
            className="mt-4"
            variant="outline"
          >
            Criar Primeira Meta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgets.map((budget) => {
            const status = budgetsStatus[budget.id];
            const percentage = status ? status.percentage * 100 : 0;

            return (
              <div
                key={budget.id}
                data-testid={`budget-card-${budget.id}`}
                className="bg-white p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-heading font-semibold">{budget.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {periodLabels[budget.period]}
                      {budget.scope === 'by_category' && (
                        <> • {getCategoryName(budget.category_id)}</>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      data-testid={`edit-budget-${budget.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingBudget(budget);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      data-testid={`delete-budget-${budget.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(budget.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-heading font-bold">
                      {formatCurrency(status?.current_amount || 0)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      de {formatCurrency(budget.limit_amount)}
                    </span>
                  </div>

                  <Progress
                    value={Math.min(percentage, 100)}
                    className="h-3"
                  />

                  <div className="flex justify-between items-center text-sm">
                    <span
                      className={`font-semibold ${
                        status?.exceeded
                          ? 'text-destructive'
                          : percentage >= 80
                          ? 'text-amber-600'
                          : 'text-accent'
                      }`}
                    >
                      {Math.round(percentage)}% utilizado
                    </span>
                    {status?.exceeded && (
                      <span className="text-destructive font-semibold">Meta Ultrapassada!</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    {budget.alerts_enabled && (
                      <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full">
                        Alertas: {Math.round(budget.alert_threshold * 100)}%
                      </span>
                    )}
                    {budget.alert_sound_enabled && (
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                        Som Ativado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BudgetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        budget={editingBudget}
        categories={categories}
        onSuccess={loadData}
      />
    </div>
  );
}
