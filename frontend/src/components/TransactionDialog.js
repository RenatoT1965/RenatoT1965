import { useState, useEffect } from 'react';
import { API, axios, toast } from '../config';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

export default function TransactionDialog({ open, onOpenChange, transaction, type, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    type: type || 'expense',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    category_id: '',
    payment_method: 'pix',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (transaction) {
      setFormData({
        type: transaction.type,
        amount: transaction.amount.toString(),
        date: new Date(transaction.date).toISOString().split('T')[0],
        description: transaction.description,
        category_id: transaction.category_id || '',
        payment_method: transaction.payment_method,
        notes: transaction.notes || '',
      });
    } else if (type) {
      setFormData((prev) => ({ ...prev, type }));
    }
  }, [transaction, type]);

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString(),
        category_id: formData.category_id || null,
      };

      if (transaction?.id) {
        await axios.put(`${API}/transactions/${transaction.id}`, payload);
        toast.success('Lançamento atualizado com sucesso');
      } else {
        await axios.post(`${API}/transactions`, payload);
        toast.success('Lançamento criado com sucesso');
      }

      onSuccess();
      onOpenChange(false);
      setFormData({
        type: 'expense',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        category_id: '',
        payment_method: 'pix',
        notes: '',
      });
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error(error.response?.data?.detail || 'Erro ao salvar lançamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="transaction-dialog" aria-describedby="transaction-dialog-description">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading">
            {transaction?.id ? 'Editar Lançamento' : 'Novo Lançamento'}
          </DialogTitle>
          <p id="transaction-dialog-description" className="sr-only">
            Formulário para criar ou editar um lançamento financeiro
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger id="type" data-testid="transaction-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Valor *</Label>
            <Input
              id="amount"
              data-testid="transaction-amount-input"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0,00"
            />
          </div>

          <div>
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              data-testid="transaction-date-input"
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              data-testid="transaction-description-input"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Supermercado"
            />
          </div>

          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger id="category" data-testid="transaction-category-select">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Sem categoria</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="payment_method">Meio de Pagamento</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
            >
              <SelectTrigger id="payment_method" data-testid="transaction-payment-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="bank_transfer">Transferência</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              data-testid="transaction-notes-input"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais..."
              rows={3}
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
              data-testid="transaction-submit-btn"
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? 'Salvando...' : transaction?.id ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
