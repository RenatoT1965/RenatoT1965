import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API, axios, toast } from '../config';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, User, Lock, Save, Loader2, Eye, EyeOff } from 'lucide-react';

export default function EditProfile() {
  const { user, token, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(`${API}/auth/profile`, 
        { name: profileData.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updateUser({ name: profileData.name });
      toast.success('Perfil atualizado!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API}/auth/password`, 
        {
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Senha atualizada!');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto" data-testid="edit-profile-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/profile')}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Editar Perfil</h1>
          <p className="text-muted-foreground">Atualize suas informações</p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-heading font-semibold">Informações Pessoais</h2>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              value={profileData.name}
              onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Seu nome"
              className="mt-1"
              data-testid="edit-name-input"
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              value={user?.email || ''}
              disabled
              className="mt-1 bg-slate-50"
            />
            <p className="text-xs text-slate-500 mt-1">O email não pode ser alterado</p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto"
            data-testid="save-profile-btn"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-xl font-heading font-semibold">Alterar Senha</h2>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <Label htmlFor="current_password">Senha atual</Label>
            <div className="relative mt-1">
              <Input
                id="current_password"
                type={showPassword ? 'text' : 'password'}
                value={passwordData.current_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                placeholder="••••••••"
                data-testid="current-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="new_password">Nova senha</Label>
            <Input
              id="new_password"
              type={showPassword ? 'text' : 'password'}
              value={passwordData.new_password}
              onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
              placeholder="••••••••"
              className="mt-1"
              data-testid="new-password-input"
            />
            <p className="text-xs text-slate-500 mt-1">Mínimo de 6 caracteres</p>
          </div>

          <div>
            <Label htmlFor="confirm_password">Confirmar nova senha</Label>
            <Input
              id="confirm_password"
              type={showPassword ? 'text' : 'password'}
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
              placeholder="••••••••"
              className="mt-1"
              data-testid="confirm-password-input"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !passwordData.current_password || !passwordData.new_password}
            variant="outline"
            className="w-full sm:w-auto"
            data-testid="change-password-btn"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Lock className="w-4 h-4 mr-2" />
            )}
            Alterar Senha
          </Button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Zona de Perigo</h3>
        <p className="text-sm text-red-600 mb-4">
          Ações irreversíveis para sua conta
        </p>
        <Button
          variant="outline"
          className="border-red-300 text-red-600 hover:bg-red-100"
          onClick={() => toast.info('Entre em contato com o suporte para excluir sua conta')}
        >
          Excluir Conta
        </Button>
      </div>
    </div>
  );
}
