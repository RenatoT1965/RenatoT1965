import { useState, useEffect } from 'react';
import { API, axios } from '../config';
import { Crown, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PlanBadge() {
  const [plan, setPlan] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      const response = await axios.get(`${API}/plans/current`);
      setPlan(response.data);
    } catch (error) {
      console.error('Error loading plan:', error);
    }
  };

  if (!plan) return null;

  const getPlanBadge = () => {
    switch (plan.plan_type) {
      case 'premium':
        return {
          icon: <Crown className="w-4 h-4" />,
          label: 'Premium',
          bg: 'bg-gradient-to-r from-yellow-400 to-orange-500',
          text: 'text-white'
        };
      case 'free_trial':
        return {
          icon: <Zap className="w-4 h-4" />,
          label: 'Teste',
          bg: 'bg-gradient-to-r from-blue-500 to-purple-500',
          text: 'text-white'
        };
      case 'basic':
        return {
          icon: null,
          label: 'Básico',
          bg: 'bg-slate-200',
          text: 'text-slate-700'
        };
      default:
        return null;
    }
  };

  const badge = getPlanBadge();
  if (!badge) return null;

  return (
    <button
      onClick={() => navigate('/pricing')}
      data-testid="plan-badge"
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-medium text-sm ${badge.bg} ${badge.text} hover:opacity-90 transition-opacity`}
    >
      {badge.icon}
      <span>{badge.label}</span>
    </button>
  );
}
