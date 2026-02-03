import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API, axios, toast } from '../config';
import { Button } from '../components/ui/button';
import { Check, X, Crown, Zap, Loader2 } from 'lucide-react';

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadPlans();
    checkPaymentStatus();
  }, []);

  const checkPaymentStatus = async () => {
    const sessionId = searchParams.get('session_id');
    const success = searchParams.get('success');
    
    if (sessionId && success) {
      // Poll for payment status
      pollPaymentStatus(sessionId);
    }
  };

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 10;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      toast.error('Não foi possível confirmar o pagamento. Verifique seu email.');
      return;
    }

    try {
      const response = await axios.get(`${API}/payments/status/${sessionId}`);
      
      if (response.data.payment_status === 'paid') {
        toast.success('Pagamento confirmado! Seu plano foi atualizado.');
        loadPlans();
        // Clear URL params
        window.history.replaceState({}, document.title, '/pricing');
        return;
      } else if (response.data.status === 'expired') {
        toast.error('Sessão de pagamento expirada. Tente novamente.');
        window.history.replaceState({}, document.title, '/pricing');
        return;
      }

      // Continue polling
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error checking payment status:', error);
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    }
  };

  const loadPlans = async () => {
    try {
      const [plansRes, currentRes] = await Promise.all([
        axios.get(`${API}/plans/available`),
        axios.get(`${API}/plans/current`)
      ]);
      setPlans(plansRes.data.plans);
      setCurrentPlan(currentRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Erro ao carregar planos');
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    if (planId === 'free_trial') return;
    
    setUpgrading(planId);
    try {
      // Create checkout session
      const response = await axios.post(`${API}/payments/checkout?plan_id=${planId}`, {}, {
        headers: {
          'Origin': window.location.origin
        }
      });

      if (response.data.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = response.data.checkout_url;
      } else {
        throw new Error('URL de checkout não recebida');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error('Erro ao iniciar pagamento');
      setUpgrading(null);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getPlanIcon = (planId) => {
    if (planId === 'premium') return <Crown className="w-6 h-6" />;
    if (planId === 'free_trial') return <Zap className="w-6 h-6" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="pricing-page">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-heading font-bold text-foreground mb-4">
          Escolha Seu Plano
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Comece grátis por 14 dias. Sem cartão de crédito necessário.
        </p>
      </div>

      {currentPlan && (
        <div className="max-w-md mx-auto bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Seu plano atual:</p>
              <p className="text-lg font-bold text-blue-900 capitalize">{currentPlan.plan_type.replace('_', ' ')}</p>
            </div>
            {currentPlan.expires_at && (
              <div className="text-right">
                <p className="text-xs text-blue-600">Expira em:</p>
                <p className="text-sm font-semibold text-blue-900">
                  {new Date(currentPlan.expires_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.id}
            data-testid={`plan-card-${plan.id}`}
            className={`rounded-2xl p-8 border-2 transition-all hover:shadow-xl ${
              plan.popular
                ? 'border-primary bg-gradient-to-b from-primary/5 to-transparent scale-105 shadow-lg'
                : 'border-slate-200 bg-white'
            }`}
          >
            {plan.popular && (
              <div className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                MAIS POPULAR
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                plan.popular ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {getPlanIcon(plan.id)}
              </div>
              <div>
                <h3 className="text-2xl font-heading font-bold">{plan.name}</h3>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-heading font-bold">{formatPrice(plan.price)}</span>
                <span className="text-slate-600">/{plan.duration}</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  {feature.startsWith('✅') || feature.startsWith('📊') || feature.startsWith('💳') || feature.startsWith('🤖') || feature.startsWith('⏰') ? (
                    <span className="text-lg">{feature.split(' ')[0]}</span>
                  ) : (
                    <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="text-sm text-slate-700">{feature.substring(2)}</span>
                </li>
              ))}
            </ul>

            <Button
              data-testid={`upgrade-btn-${plan.id}`}
              onClick={() => handleUpgrade(plan.id)}
              disabled={upgrading || currentPlan?.plan_type === plan.id || plan.id === 'free_trial'}
              className={`w-full py-6 rounded-full font-semibold ${
                plan.popular
                  ? 'bg-primary hover:bg-primary/90 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
              }`}
            >
              {upgrading === plan.id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirecionando...
                </>
              ) : currentPlan?.plan_type === plan.id ? (
                'Plano Atual'
              ) : plan.id === 'free_trial' ? (
                'Teste Grátis Ativo'
              ) : (
                'Assinar Agora'
              )}
            </Button>
          </div>
        ))}
      </div>

      <div className="max-w-4xl mx-auto bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-8 border-2 border-emerald-200">
        <div className="text-center">
          <h3 className="text-2xl font-heading font-bold mb-4">Garantia de 7 dias</h3>
          <p className="text-slate-700">
            Não gostou? Reembolsamos 100% do seu dinheiro em até 7 dias, sem perguntas.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <h3 className="text-2xl font-heading font-bold text-center mb-6">Perguntas Frequentes</h3>
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h4 className="font-semibold mb-2">Como funciona o teste grátis?</h4>
            <p className="text-sm text-slate-600">
              Você tem 14 dias para usar todas as funcionalidades Premium sem custo. Não precisa cadastrar cartão.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h4 className="font-semibold mb-2">Posso cancelar a qualquer momento?</h4>
            <p className="text-sm text-slate-600">
              Sim! Você pode cancelar sua assinatura a qualquer momento sem burocracia.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h4 className="font-semibold mb-2">Como faço o pagamento?</h4>
            <p className="text-sm text-slate-600">
              Aceitamos cartão de crédito através do Stripe, a plataforma de pagamentos mais segura do mundo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
