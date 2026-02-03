import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Wallet, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Bem-vindo de volta!');
      } else {
        if (formData.password !== formData.confirmPassword) {
          toast.error('As senhas não coincidem');
          setLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres');
          setLoading(false);
          return;
        }
        await register(formData.name, formData.email, formData.password);
        toast.success('Conta criada com sucesso!');
      }
      navigate(from, { replace: true });
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao processar solicitação';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-heading font-bold text-foreground">FinanceFlow</h1>
          </div>
          <p className="text-slate-600">
            {isLogin ? 'Entre na sua conta' : 'Crie sua conta grátis'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={handleChange}
                    required={!isLogin}
                    className="pl-10 h-12 rounded-xl"
                    data-testid="auth-name-input"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="pl-10 h-12 rounded-xl"
                  data-testid="auth-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="pl-10 h-12 rounded-xl"
                  data-testid="auth-password-input"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required={!isLogin}
                    className="pl-10 h-12 rounded-xl"
                    data-testid="auth-confirm-password-input"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold"
              data-testid="auth-submit-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Entrar' : 'Criar conta'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ name: '', email: '', password: '', confirmPassword: '' });
              }}
              className="text-primary hover:text-primary/80 font-medium text-sm"
              data-testid="auth-toggle-btn"
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-white/50 rounded-xl">
            <div className="text-2xl mb-1">📊</div>
            <p className="text-xs text-slate-600">Controle total</p>
          </div>
          <div className="p-4 bg-white/50 rounded-xl">
            <div className="text-2xl mb-1">🤖</div>
            <p className="text-xs text-slate-600">IA assistente</p>
          </div>
          <div className="p-4 bg-white/50 rounded-xl">
            <div className="text-2xl mb-1">💳</div>
            <p className="text-xs text-slate-600">Cartões</p>
          </div>
        </div>

        {/* Trial info */}
        <p className="mt-6 text-center text-sm text-slate-500">
          14 dias grátis • Sem cartão de crédito
        </p>
      </div>
    </div>
  );
}
