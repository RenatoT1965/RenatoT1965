import { useState, useEffect } from 'react';
import { API, axios } from '../config';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';

export default function UsageIndicator() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadPlanUsage();
  }, []);

  const loadPlanUsage = async () => {
    try {
      const response = await axios.get(`${API}/plans/current`);
      setPlan(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading plan usage:', error);
      setLoading(false);
    }
  };

  if (loading || !plan || plan.plan_type === 'premium') return null;

  const limits = plan.limits || {};
  const usage = plan.current_usage || {};

  const transLimit = limits.transactions_per_month || 0;
  const transUsage = usage.transactions || 0;
  const transPercent = transLimit > 0 ? (transUsage / transLimit) * 100 : 0;

  const aiLimit = limits.ai_messages_per_month || 0;
  const aiUsage = usage.ai_messages || 0;
  const aiPercent = aiLimit > 0 ? (aiUsage / aiLimit) * 100 : 0;

  const showWarning = transPercent >= 80 || aiPercent >= 80;

  return (
    <div className={`rounded-2xl p-6 border-2 ${
      showWarning ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-200'
    }`} data-testid="usage-indicator">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg">Uso do Plano {plan.plan_type === 'free_trial' ? 'Teste' : 'Básico'}</h3>
          <p className="text-sm text-slate-600">Acompanhe seu uso mensal</p>
        </div>
        {showWarning && (
          <Button
            onClick={() => navigate('/pricing')}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Upgrade
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Transações</span>
            <span className={transPercent >= 80 ? 'text-amber-700 font-semibold' : 'text-slate-600'}>
              {transUsage} / {transLimit}
            </span>
          </div>
          <Progress value={Math.min(transPercent, 100)} className="h-2" />
        </div>

        {aiLimit > 0 && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Mensagens IA</span>
              <span className={aiPercent >= 80 ? 'text-amber-700 font-semibold' : 'text-slate-600'}>
                {aiUsage} / {aiLimit}
              </span>
            </div>
            <Progress value={Math.min(aiPercent, 100)} className="h-2" />
          </div>
        )}

        <div className="pt-2 border-t border-slate-200">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Cartões cadastrados</span>
            <span className="text-slate-600">{usage.cards || 0} / {limits.max_cards || 0}</span>
          </div>
        </div>
      </div>

      {showWarning && (
        <div className="mt-4 p-3 bg-white rounded-lg border border-amber-300">
          <p className="text-sm text-amber-800">
            ⚠️ Você está próximo do limite! Considere fazer upgrade para continuar sem restrições.
          </p>
        </div>
      )}
    </div>
  );
}
