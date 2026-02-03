import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';

export default function AuthScreen({ navigation }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const { login, register } = useAuth();

  const handleSubmit = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (!isLogin) {
      if (!formData.name) {
        Alert.alert('Erro', 'Preencha o nome');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Erro', 'As senhas não coincidem');
        return;
      }
      if (formData.password.length < 6) {
        Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData.name, formData.email, formData.password);
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao processar solicitação';
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#F8FAFC', '#ECFDF5', '#F0FDFA']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              style={styles.logoCircle}
            >
              <Text style={styles.logoText}>F</Text>
            </LinearGradient>
            <Text style={styles.appName}>FinanceFlow</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Entre na sua conta' : 'Crie sua conta grátis'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            {!isLogin && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Nome completo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Seu nome"
                  placeholderTextColor={colors.textMuted}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
              />
            </View>

            {!isLogin && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirmar senha</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitText}>
                    {isLogin ? 'Entrar' : 'Criar conta'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => {
                setIsLogin(!isLogin);
                setFormData({ name: '', email: '', password: '', confirmPassword: '' });
              }}
            >
              <Text style={styles.toggleText}>
                {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Features */}
          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>📊</Text>
              <Text style={styles.featureText}>Controle total</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🤖</Text>
              <Text style={styles.featureText}>IA assistente</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>💳</Text>
              <Text style={styles.featureText}>Cartões</Text>
            </View>
          </View>

          <Text style={styles.trialText}>14 dias grátis • Sem cartão de crédito</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  appName: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFF',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  toggleButton: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  toggleText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xl,
  },
  featureItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 90,
  },
  featureEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  featureText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  trialText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.lg,
  },
});
