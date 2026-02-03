import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API, axios, toast } from '../config';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Wallet, CreditCard, Target, ArrowRight, ArrowLeft, 
  Check, Sparkles, ChevronRight, Plus
} from 'lucide-react';

const STEPS = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao FinanceFlow!',
    subtitle: 'Vamos configurar sua conta em poucos passos',
    icon: Wallet
  },
  {
    id: 'card',
    title: 'Adicione seu primeiro cartão',
    subtitle: 'Opcional - você pode pular e adicionar depois',
    icon: CreditCard
  },
  {
    id: 'budget',
    title: 'Defina uma meta de gastos',
    subtitle: 'Controle seus gastos mensais',
    icon: Target
  },
  {
    id: 'complete',
    title: 'Tudo pronto!',
    subtitle: 'Sua conta está configurada',
    icon: Sparkles
  }
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState({
    name: '',
    brand: 'visa',
    last_four_digits: '',
    credit_limit: '',
    closing_day: '15',
    due_day: '25'
  });
  const [budgetData, setBudgetData] = useState({
    name: 'Gastos Mensais',
    limit_amount: ''
  });
  
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleAddCard = async () => {
    if (!cardData.name || !cardData.last_four_digits || !cardData.credit_limit) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/cards`, {
        ...cardData,
        credit_limit: parseFloat(cardData.credit_limit),
        closing_day: parseInt(cardData.closing_day),
        due_day: parseInt(cardData.due_day)
      });
      toast.success('Cartão adicionado!');
      handleNext();
    } catch (error) {
      toast.error('Erro ao adicionar cartão');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBudget = async () => {
    if (!budgetData.limit_amount) {
      toast.error('Defina um valor limite');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/budgets`, {
        name: budgetData.name,
        period: 'monthly',
        limit_amount: parseFloat(budgetData.limit_amount),
        scope: 'total_expenses',
        alerts_enabled: true,
        alert_sound_enabled: true,
        alert_threshold: 0.8
      });
      toast.success('Meta criada!');
      handleNext();
    } catch (error) {
      toast.error('Erro ao criar meta');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    // Mark onboarding as complete
    try {
      await axios.post(`${API}/users/complete-onboarding`);
    } catch (error) {
      // Endpoint might not exist yet, continue anyway
    }
    
    // Update local user state
    updateUser({ onboarding_completed: true });
    localStorage.setItem('onboarding_completed', 'true');
    
    navigate('/');
    toast.success('Vamos começar!');
  };

  const step = STEPS[currentStep];
  const StepIcon = step.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all ${
                idx <= currentStep ? 'bg-primary w-8' : 'bg-slate-200 w-2'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-emerald-600 p-8 text-white text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <StepIcon className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-heading font-bold">{step.title}</h2>
            <p className="text-white/80 mt-2">{step.subtitle}</p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Welcome Step */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-lg text-slate-700 mb-6">
                    Olá, <span className="font-semibold text-primary">{user?.name || 'usuário'}</span>! 👋
                  </p>
                  <p className="text-slate-600">
                    O FinanceFlow vai ajudar você a controlar suas finanças de forma simples e inteligente.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <div className="text-2xl mb-2">📊</div>
                    <p className="text-xs text-slate-600">Dashboard completo</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <div className="text-2xl mb-2">🤖</div>
                    <p className="text-xs text-slate-600">Assistente IA</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <div className="text-2xl mb-2">💳</div>
                    <p className="text-xs text-slate-600">Gestão de cartões</p>
                  </div>
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90"
                >
                  Começar Configuração
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            )}

            {/* Card Step */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome do Cartão *</Label>
                    <Input
                      placeholder="Ex: Nubank, Itaú"
                      value={cardData.name}
                      onChange={(e) => setCardData(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Bandeira</Label>
                    <select
                      value={cardData.brand}
                      onChange={(e) => setCardData(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="visa">Visa</option>
                      <option value="mastercard">Mastercard</option>
                      <option value="elo">Elo</option>
                      <option value="amex">Amex</option>
                      <option value="hipercard">Hipercard</option>
                    </select>
                  </div>
                  <div>
                    <Label>Últimos 4 dígitos *</Label>
                    <Input
                      placeholder="1234"
                      maxLength={4}
                      value={cardData.last_four_digits}
                      onChange={(e) => setCardData(prev => ({ ...prev, last_four_digits: e.target.value.replace(/\D/g, '') }))}
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Limite de Crédito *</Label>
                    <Input
                      type="number"
                      placeholder="5000.00"
                      value={cardData.credit_limit}
                      onChange={(e) => setCardData(prev => ({ ...prev, credit_limit: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Dia de fechamento</Label>
                    <Input
                      type="number"
                      min="1"
                      max="28"
                      value={cardData.closing_day}
                      onChange={(e) => setCardData(prev => ({ ...prev, closing_day: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Dia de vencimento</Label>
                    <Input
                      type="number"
                      min="1"
                      max="28"
                      value={cardData.due_day}
                      onChange={(e) => setCardData(prev => ({ ...prev, due_day: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="flex-1 h-12 rounded-xl"
                  >
                    Pular
                  </Button>
                  <Button
                    onClick={handleAddCard}
                    disabled={loading}
                    className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90"
                  >
                    {loading ? 'Salvando...' : 'Adicionar Cartão'}
                  </Button>
                </div>
              </div>
            )}

            {/* Budget Step */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>Nome da Meta</Label>
                  <Input
                    value={budgetData.name}
                    onChange={(e) => setBudgetData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Limite Mensal de Gastos *</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                    <Input
                      type="number"
                      placeholder="3000.00"
                      value={budgetData.limit_amount}
                      onChange={(e) => setBudgetData(prev => ({ ...prev, limit_amount: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Você receberá alertas quando atingir 80% deste valor
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
                  <p className="text-sm text-amber-800">
                    💡 <strong>Dica:</strong> Comece com um valor realista baseado nos seus gastos atuais.
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="flex-1 h-12 rounded-xl"
                  >
                    Pular
                  </Button>
                  <Button
                    onClick={handleAddBudget}
                    disabled={loading}
                    className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90"
                  >
                    {loading ? 'Salvando...' : 'Criar Meta'}
                  </Button>
                </div>
              </div>
            )}

            {/* Complete Step */}
            {currentStep === 3 && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                
                <div>
                  <p className="text-lg text-slate-700 mb-2">
                    Sua conta está pronta para uso!
                  </p>
                  <p className="text-slate-500">
                    Agora você pode começar a registrar suas transações e acompanhar suas finanças.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 text-left">
                  <p className="font-medium text-slate-700 mb-3">Próximos passos:</p>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-primary" />
                      Adicione sua primeira transação
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-primary" />
                      Explore o Assistente IA para dicas
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-primary" />
                      Importe seu extrato bancário
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={handleComplete}
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90"
                >
                  Ir para o Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          {currentStep > 0 && currentStep < 3 && (
            <div className="px-8 pb-8">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            </div>
          )}
        </div>

        {/* Skip All */}
        {currentStep < 3 && (
          <button
            onClick={() => {
              localStorage.setItem('onboarding_completed', 'true');
              navigate('/');
            }}
            className="w-full text-center mt-4 text-sm text-slate-500 hover:text-slate-700"
          >
            Pular configuração e ir direto ao app
          </button>
        )}
      </div>
    </div>
  );
}
