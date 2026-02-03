import { useState, useEffect } from 'react';
import { API, axios, toast } from '../config';
import { Button } from '../components/ui/button';
import { Plus, CreditCard as CreditCardIcon, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import CardDialog from '../components/CardDialog';
import { Progress } from '../components/ui/progress';
import { getBankColor } from '../utils/bankColors';

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [invoices, setInvoices] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const cardsResponse = await axios.get(`${API}/cards`);
      setCards(cardsResponse.data);

      const invoicesData = {};
      for (const card of cardsResponse.data) {
        if (card.active) {
          const invoiceResponse = await axios.get(`${API}/cards/${card.id}/invoice`);
          invoicesData[card.id] = invoiceResponse.data;
        }
      }
      setInvoices(invoicesData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading cards:', error);
      toast.error('Erro ao carregar cartões');
      setLoading(false);
    }
  };

  const handleSync = async (cardId) => {
    try {
      await axios.post(`${API}/cards/${cardId}/sync`);
      toast.success('Cartão sincronizado com sucesso!');
      loadCards();
    } catch (error) {
      console.error('Error syncing card:', error);
      toast.error('Erro ao sincronizar cartão');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getBrandColor = (cardName) => {
    const bankColors = getBankColor(cardName);
    return `bg-gradient-to-br ${bankColors.gradient}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="cards-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">Cartões</h1>
          <p className="text-muted-foreground mt-2">Gerencie seus cartões e faturas em um só lugar</p>
        </div>
        <Button
          data-testid="add-card-btn"
          onClick={() => {
            setEditingCard(null);
            setDialogOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 py-6 font-medium shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cartão
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-border text-center">
          <CreditCardIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Nenhum cartão cadastrado</p>
          <Button onClick={() => setDialogOpen(true)} variant="outline">
            Adicionar Primeiro Cartão
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cards.map((card) => {
            const invoice = invoices[card.id];
            if (!invoice || !card.active) return null;

            const daysUntilDue = Math.ceil(
              (new Date(invoice.due_date) - new Date()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={card.id}
                data-testid={`card-${card.id}`}
                className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className={`${getBrandColor(card.name)} p-6 text-white`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm opacity-90">Cartão de Crédito</p>
                      <h3 className="text-2xl font-heading font-bold mt-1">{card.name}</h3>
                    </div>
                    <CreditCardIcon className="w-8 h-8 opacity-80" />
                  </div>
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <span>•••• {card.last_four_digits}</span>
                    <span>|</span>
                    <span className="uppercase">{card.brand}</span>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-700">Limite Utilizado</span>
                      <span className="text-sm font-semibold text-slate-700">
                        {formatCurrency(invoice.used_amount)} / {formatCurrency(card.credit_limit)}
                      </span>
                    </div>
                    <Progress value={Math.min(invoice.usage_percentage, 100)} className="h-2" />
                    <p className="text-xs text-slate-600 mt-1">
                      {invoice.usage_percentage.toFixed(1)}% do limite
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Calendar className="w-4 h-4" />
                        <span>Fecha dia {card.closing_day}</span>
                      </div>
                      <span className="text-xs text-slate-600">{formatDate(invoice.closing_date)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <AlertCircle className="w-4 h-4" />
                        <span>Vence dia {card.due_day}</span>
                      </div>
                      <span className={`text-xs font-semibold ${
                        daysUntilDue <= 5 ? 'text-red-600' : 'text-slate-600'
                      }`}>
                        {daysUntilDue > 0 ? `${daysUntilDue} dias` : 'Vencido'}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-slate-700">Fatura Atual</span>
                        <span className="text-lg font-bold text-slate-900">
                          {formatCurrency(invoice.used_amount || 0)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{invoice.total_transactions || 0} transações</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      data-testid={`sync-card-${card.id}`}
                      onClick={() => handleSync(card.id)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Sincronizar
                    </Button>
                    <Button
                      data-testid={`edit-card-${card.id}`}
                      onClick={() => {
                        setEditingCard(card);
                        setDialogOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        card={editingCard}
        onSuccess={loadCards}
      />
    </div>
  );
}
