import { useState, useEffect } from 'react';
import { API, axios, toast } from '../config';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export default function CardDialog({ open, onOpenChange, card, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    brand: 'visa',
    last_four_digits: '',
    credit_limit: '',
    closing_day: '10',
    due_day: '20',
    active: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (card) {
      setFormData({
        name: card.name,
        brand: card.brand,
        last_four_digits: card.last_four_digits,
        credit_limit: card.credit_limit.toString(),
        closing_day: card.closing_day.toString(),
        due_day: card.due_day.toString(),
        active: card.active,
      });
    } else {
      setFormData({
        name: '',
        brand: 'visa',
        last_four_digits: '',
        credit_limit: '',
        closing_day: '10',
        due_day: '20',
        active: true,
      });
    }
  }, [card]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        credit_limit: parseFloat(formData.credit_limit),
        closing_day: parseInt(formData.closing_day),
        due_day: parseInt(formData.due_day),
      };

      if (card?.id) {
        await axios.put(`${API}/cards/${card.id}`, payload);
        toast.success('Cartão atualizado com sucesso');
      } else {
        await axios.post(`${API}/cards`, payload);
        toast.success('Cartão criado com sucesso');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving card:', error);
      toast.error(error.response?.data?.detail || 'Erro ao salvar cartão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="card-dialog" aria-describedby="card-dialog-description">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading">
            {card?.id ? 'Editar Cartão' : 'Novo Cartão'}
          </DialogTitle>
          <p id="card-dialog-description" className="sr-only">
            Formulário para criar ou editar um cartão de crédito
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Cartão *</Label>
            <Input
              id="name"
              data-testid="card-name-input"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Nubank Platinum"
            />
          </div>

          <div>
            <Label htmlFor="brand">Bandeira</Label>
            <Select
              value={formData.brand}
              onValueChange={(value) => setFormData({ ...formData, brand: value })}
            >
              <SelectTrigger id="brand" data-testid="card-brand-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visa">Visa</SelectItem>
                <SelectItem value="mastercard">Mastercard</SelectItem>
                <SelectItem value="elo">Elo</SelectItem>
                <SelectItem value="amex">American Express</SelectItem>
                <SelectItem value="hipercard">Hipercard</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="last_four_digits">Últimos 4 Dígitos *</Label>
            <Input
              id="last_four_digits"
              data-testid="card-digits-input"
              required
              maxLength={4}
              pattern="[0-9]{4}"
              value={formData.last_four_digits}
              onChange={(e) => setFormData({ ...formData, last_four_digits: e.target.value })}
              placeholder="1234"
            />
          </div>

          <div>
            <Label htmlFor="credit_limit">Limite de Crédito (R$) *</Label>
            <Input
              id="credit_limit"
              data-testid="card-limit-input"
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.credit_limit}
              onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
              placeholder="5000.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="closing_day">Dia de Fechamento *</Label>
              <Input
                id="closing_day"
                data-testid="card-closing-input"
                type="number"
                min="1"
                max="28"
                required
                value={formData.closing_day}
                onChange={(e) => setFormData({ ...formData, closing_day: e.target.value })}
              />
              <p className="text-xs text-slate-600 mt-1">Dia 1-28</p>
            </div>

            <div>
              <Label htmlFor="due_day">Dia de Vencimento *</Label>
              <Input
                id="due_day"
                data-testid="card-due-input"
                type="number"
                min="1"
                max="28"
                required
                value={formData.due_day}
                onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
              />
              <p className="text-xs text-slate-600 mt-1">Dia 1-28</p>
            </div>
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
              data-testid="card-submit-btn"
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? 'Salvando...' : card?.id ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
