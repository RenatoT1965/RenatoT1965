import { useState, useEffect } from 'react';
import { API, axios, toast } from '../config';
import { TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Predictions() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      const response = await axios.get(`${API}/predictions?months=3`);
      setPredictions(response.data.predictions);
      setLoading(false);
    } catch (error) {
      console.error('Error loading predictions:', error);
      toast.error('Erro ao carregar previsões');
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const chartData = predictions.map(p => ({
    month: p.month_name.split(' ')[0].substring(0, 3),
    previsto: p.predicted_total
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="predictions-page">
      <div>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">Previsão de Despesas</h1>
        <p className="text-muted-foreground mt-2">
          Projeção baseada no seu histórico e despesas recorrentes
        </p>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border-2 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">Como funciona a previsão?</h3>
            <p className="text-sm text-amber-800">
              Calculamos a média das suas despesas dos últimos 6 meses por categoria e adicionamos 
              suas despesas recorrentes configuradas. Use isso para ajustar suas metas de gastos.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
        <h2 className="text-2xl font-heading font-semibold mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          Visão Geral - Próximos 3 Meses
        </h2>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" stroke="#64748b" />
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
            <Bar dataKey="previsto" fill="#f59e0b" name="Despesa Prevista" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {predictions.map((prediction, index) => {
          const categoryDetails = prediction.details.filter(d => d.category_id);
          const recurringDetails = prediction.details.filter(d => d.type === 'recurring');

          return (
            <div
              key={index}
              data-testid={`prediction-${prediction.month}`}
              className="bg-white rounded-2xl shadow-sm border border-border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-heading font-semibold">{prediction.month_name}</h3>
              </div>

              <div className="mb-4 pb-4 border-b border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Total Previsto</p>
                <p className="text-3xl font-heading font-bold text-amber-600">
                  {formatCurrency(prediction.predicted_total)}
                </p>
              </div>

              {categoryDetails.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Por Categoria:</p>
                  <div className="space-y-2">
                    {categoryDetails.slice(0, 3).map((detail, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">{detail.category_name}</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(detail.predicted_amount)}
                        </span>
                      </div>
                    ))}
                    {categoryDetails.length > 3 && (
                      <p className="text-xs text-slate-500">
                        +{categoryDetails.length - 3} outras categorias
                      </p>
                    )}
                  </div>
                </div>
              )}

              {recurringDetails.length > 0 && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Recorrentes:</p>
                  <div className="space-y-1">
                    {recurringDetails.map((detail, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-slate-600">{detail.description}</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(detail.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Dica: Ajuste suas metas
        </h3>
        <p className="text-sm text-blue-800">
          Com base nessas previsões, considere ajustar suas metas de gastos na página de{' '}
          <a href="/budgets" className="font-semibold underline">Metas</a> para manter suas 
          finanças sob controle nos próximos meses.
        </p>
      </div>
    </div>
  );
}
