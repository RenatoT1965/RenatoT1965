import { useState, useEffect } from 'react';
import { API, axios, toast } from '../config';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';

export default function BudgetDialog({ open, onOpenChange, budget, categories, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    period: 'monthly',
    start_date: '',
    end_date: '',
    limit_amount: '',
    scope: 'total_expenses',
    category_id: '',
    alerts_enabled: true,
    alert_sound_enabled: true,
    alert_threshold: '0.8',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (budget) {
      setFormData({
        name: budget.name,
        period: budget.period,
        start_date: budget.start_date ? new Date(budget.start_date).toISOString().split('T')[0] : '',
        end_date: budget.end_date ? new Date(budget.end_date).toISOString().split('T')[0] : '',
        limit_amount: budget.limit_amount.toString(),
        scope: budget.scope,
        category_id: budget.category_id || '',
        alerts_enabled: budget.alerts_enabled,
        alert_sound_enabled: budget.alert_sound_enabled,
        alert_threshold: budget.alert_threshold.toString(),
      });
    } else {
      setFormData({
        name: '',
        period: 'monthly',
        start_date: '',
        end_date: '',
        limit_amount: '',
        scope: 'total_expenses',
        category_id: '',
        alerts_enabled: true,
        alert_sound_enabled: true,
        alert_threshold: '0.8',
      });
    }
  }, [budget]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        period: formData.period,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        limit_amount: parseFloat(formData.limit_amount),
        scope: formData.scope,
        category_id: formData.category_id || null,
        alerts_enabled: formData.alerts_enabled,
        alert_sound_enabled: formData.alert_sound_enabled,
        alert_threshold: parseFloat(formData.alert_threshold),
      };

      if (budget?.id) {
        await axios.put(`${API}/budgets/${budget.id}`, payload);
        toast.success('Meta atualizada com sucesso');
      } else {
        await axios.post(`${API}/budgets`, payload);
        toast.success('Meta criada com sucesso');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error(error.response?.data?.detail || 'Erro ao salvar meta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="budget-dialog" aria-describedby="budget-dialog-description">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading">
            {budget?.id ? 'Editar Meta' : 'Nova Meta'}
          </DialogTitle>
          <p id="budget-dialog-description" className="sr-only">
            Formulário para criar ou editar uma meta de gastos
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Meta *</Label>
            <Input
              id="name"
              data-testid="budget-name-input"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Gastos Mensais"
            />
          </div>

          <div>
            <Label htmlFor="period">Período</Label>
            <Select
              value={formData.period}
              onValueChange={(value) => setFormData({ ...formData, period: value })}
            >
              <SelectTrigger id="period" data-testid="budget-period-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="custom_range">Período Customizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.period === 'custom_range' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Data Início</Label>
                <Input
                  id="start_date"
                  data-testid="budget-start-date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_date">Data Fim</Label>
                <Input
                  id="end_date"
                  data-testid="budget-end-date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="limit_amount">Limite (R$) *</Label>
            <Input
              id="limit_amount"
              data-testid="budget-limit-input"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.limit_amount}
              onChange={(e) => setFormData({ ...formData, limit_amount: e.target.value })}
              placeholder="0,00"
            />
          </div>

          <div>
            <Label htmlFor="scope">Escopo</Label>
            <Select
              value={formData.scope}
              onValueChange={(value) => setFormData({ ...formData, scope: value })}
            >
              <SelectTrigger id="scope" data-testid="budget-scope-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total_expenses">Total de Despesas</SelectItem>
                <SelectItem value="by_category">Por Categoria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.scope === 'by_category' && (
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger id="category" data-testid="budget-category-select">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="alert_threshold">Limiar de Alerta (%) *</Label>
            <Input
              id="alert_threshold"
              data-testid="budget-threshold-input"
              type="number"
              step="0.01"
              min="0.01"
              max="1"
              required
              value={formData.alert_threshold}
              onChange={(e) => setFormData({ ...formData, alert_threshold: e.target.value })}
              placeholder="0.8 (80%)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Valor entre 0.01 e 1.0 (ex: 0.8 = 80%)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="alerts_enabled">Alertas Visuais</Label>
            <Switch
              id="alerts_enabled"
              data-testid="budget-alerts-switch"
              checked={formData.alerts_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, alerts_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="alert_sound_enabled">Alertas Sonoros</Label>
            <Switch
              id="alert_sound_enabled"
              data-testid="budget-sound-switch"
              checked={formData.alert_sound_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, alert_sound_enabled: checked })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              data-testid="budget-submit-btn"
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? 'Salvando...' : budget?.id ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
