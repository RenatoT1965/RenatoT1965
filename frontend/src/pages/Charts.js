import { useState, useEffect } from 'react';
import { API, axios, toast } from '../config';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

export default function Charts() {
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('bar');
  const [granularity, setGranularity] = useState('day');
  const [pieType, setPieType] = useState('expenses');
  const [pieGroupBy, setPieGroupBy] = useState('category');
  const [filters, setFilters] = useState({
    category_id: '',
    payment_method: '',
  });

  useEffect(() => {
    loadData();
  }, [granularity, filters]);

  useEffect(() => {
    loadPieData();
  }, [pieType, pieGroupBy]);

  const loadData = async () => {
    try {
      const [chartResponse, categoriesResponse] = await Promise.all([
        axios.get(`${API}/reports/chart-data`, {
          params: { granularity, ...filters },
        }),
        axios.get(`${API}/categories`),
      ]);
      setChartData(chartResponse.data);
      setCategories(categoriesResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading chart data:', error);
      toast.error('Erro ao carregar gráficos');
      setLoading(false);
    }
  };

  const loadPieData = async () => {
    try {
      const response = await axios.get(`${API}/reports/pie-chart`, {
        params: { type: pieType, group_by: pieGroupBy },
      });
      setPieData(response.data.data);
    } catch (error) {
      console.error('Error loading pie chart data:', error);
      toast.error('Erro ao carregar gráfico de pizza');
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/export/excel`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'organizze_export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Exportação concluída com sucesso!');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erro ao exportar dados');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-semibold text-sm"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
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
    <div className="space-y-6" data-testid="charts-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">Gráficos</h1>
          <p className="text-muted-foreground mt-2">Visualize suas finanças ao longo do tempo</p>
        </div>
        <Button
          data-testid="export-excel-btn"
          onClick={handleExport}
          className="bg-accent hover:bg-accent/90 text-white rounded-full px-6 py-6 font-medium shadow-lg"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Tipo de Gráfico</label>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger data-testid="chart-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Barras</SelectItem>
                <SelectItem value="line">Linha</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Granularidade</label>
            <Select value={granularity} onValueChange={setGranularity}>
              <SelectTrigger data-testid="granularity-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Dia</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Categoria</label>
            <Select
              value={filters.category_id}
              onValueChange={(value) => setFilters({ ...filters, category_id: value })}
            >
              <SelectTrigger data-testid="filter-category-chart">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Todas</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Meio de Pagamento</label>
            <Select
              value={filters.payment_method}
              onValueChange={(value) => setFilters({ ...filters, payment_method: value })}
            >
              <SelectTrigger data-testid="filter-payment-chart">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Todos</SelectItem>
                {Object.entries(paymentMethodLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
        {chartData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum dado disponível para exibir</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            {chartType === 'bar' ? (
              <BarChart data={chartData} data-testid="bar-chart">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="income" fill="#10B981" name="Receitas" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expenses" fill="#EF4444" name="Despesas" radius={[8, 8, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={chartData} data-testid="line-chart">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Receitas"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#EF4444"
                  strokeWidth={2}
                  name="Despesas"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#065F46"
                  strokeWidth={2}
                  name="Saldo"
                  dot={{ r: 4 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
