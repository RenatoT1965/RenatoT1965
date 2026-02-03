import { useState, useEffect } from 'react';
import { API, axios, toast } from '../config';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Plus, Pencil, Trash2, Copy, Filter } from 'lucide-react';
import TransactionDialog from '../components/TransactionDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    category_id: '',
    payment_method: '',
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      const [transResponse, catResponse] = await Promise.all([
        axios.get(`${API}/transactions`, { params: filters }),
        axios.get(`${API}/categories`),
      ]);
      setTransactions(transResponse.data);
      setCategories(catResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar lançamentos');
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) return;
    
    try {
      await axios.delete(`${API}/transactions/${id}`);
      toast.success('Lançamento excluído com sucesso');
      loadData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Erro ao excluir lançamento');
    }
  };

  const handleDuplicate = (transaction) => {
    setEditingTransaction({
      ...transaction,
      id: null,
      description: `${transaction.description} (Cópia)`,
    });
    setDialogOpen(true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Sem categoria';
  };

  const paymentMethodLabels = {
    cash: 'Dinheiro',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    pix: 'PIX',
    bank_transfer: 'Transferência',
    other: 'Outro',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="transactions-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">Lançamentos</h1>
          <p className="text-muted-foreground mt-2">Gerencie suas receitas e despesas</p>
        </div>
        <Button
          data-testid="add-transaction-btn"
          onClick={() => {
            setEditingTransaction(null);
            setDialogOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 py-6 font-medium shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Lançamento
        </Button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
            <SelectTrigger data-testid="filter-type">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Todos</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.category_id} onValueChange={(value) => setFilters({ ...filters, category_id: value })}>
            <SelectTrigger data-testid="filter-category">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Todas</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.payment_method} onValueChange={(value) => setFilters({ ...filters, payment_method: value })}>
            <SelectTrigger data-testid="filter-payment-method">
              <SelectValue placeholder="Meio de Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Todos</SelectItem>
              {Object.entries(paymentMethodLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum lançamento encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-semibold">Descrição</th>
                  <th className="text-left p-4 font-semibold">Tipo</th>
                  <th className="text-left p-4 font-semibold">Categoria</th>
                  <th className="text-left p-4 font-semibold">Meio de Pgto</th>
                  <th className="text-right p-4 font-semibold">Valor</th>
                  <th className="text-left p-4 font-semibold">Data</th>
                  <th className="text-right p-4 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    data-testid={`transaction-row-${transaction.id}`}
                    className="border-b border-border hover:bg-secondary/30 transition-colors"
                  >
                    <td className="p-4">
                      <p className="font-medium">{transaction.description}</p>
                      {transaction.notes && (
                        <p className="text-sm text-muted-foreground">{transaction.notes}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.type === 'income'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}>
                        {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className="p-4 text-sm">{getCategoryName(transaction.category_id)}</td>
                    <td className="p-4 text-sm">{paymentMethodLabels[transaction.payment_method]}</td>
                    <td className={`p-4 text-right font-semibold ${
                      transaction.type === 'income' ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </td>
                    <td className="p-4 text-sm">
                      {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          data-testid={`edit-transaction-${transaction.id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTransaction(transaction);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          data-testid={`duplicate-transaction-${transaction.id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(transaction)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          data-testid={`delete-transaction-${transaction.id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(transaction.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={editingTransaction}
        onSuccess={loadData}
      />
    </div>
  );
}
