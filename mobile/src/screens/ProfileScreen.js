import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import API_URL from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [plan, setPlan] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const [planRes, transRes, cardsRes] = await Promise.all([
        axios.get(`${API_URL}/plans/current`),
        axios.get(`${API_URL}/transactions`),
        axios.get(`${API_URL}/cards`)
      ]);

      setPlan(planRes.data);
      setStats({
        totalTransactions: transRes.data.length,
        totalCards: cardsRes.data.filter(c => c.active).length,
        totalIncome: transRes.data.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        totalExpenses: transRes.data.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => logout()
        }
      ]
    );
  };

  const getPlanGradient = () => {
    switch (plan?.plan_type) {
      case 'premium':
        return ['#F59E0B', '#D97706'];
      case 'free_trial':
        return ['#3B82F6', '#8B5CF6'];
      default:
        return ['#64748B', '#475569'];
    }
  };

  const getPlanLabel = () => {
    switch (plan?.plan_type) {
      case 'premium': return 'Premium';
      case 'free_trial': return 'Teste Grátis';
      default: return 'Básico';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Card */}
      <View style={styles.userCard}>
        <LinearGradient
          colors={getPlanGradient()}
          style={styles.userHeader}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Usuário'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </LinearGradient>

        <View style={styles.planSection}>
          <View style={styles.planInfo}>
            <Text style={styles.planLabel}>Plano atual</Text>
            <Text style={styles.planName}>{getPlanLabel()}</Text>
          </View>
          {plan?.expires_at && (
            <View style={styles.planExpiry}>
              <Text style={styles.expiryLabel}>Expira em</Text>
              <Text style={styles.expiryDate}>
                {new Date(plan.expires_at).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.totalTransactions || 0}</Text>
          <Text style={styles.statLabel}>Transações</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.totalCards || 0}</Text>
          <Text style={styles.statLabel}>Cartões</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: '#F0FDF4' }]}>
          <Text style={[styles.statValue, { color: colors.income, fontSize: 16 }]}>
            {formatCurrency(stats?.totalIncome || 0)}
          </Text>
          <Text style={styles.statLabel}>Receitas</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: '#FEF2F2' }]}>
          <Text style={[styles.statValue, { color: colors.expense, fontSize: 16 }]}>
            {formatCurrency(stats?.totalExpenses || 0)}
          </Text>
          <Text style={styles.statLabel}>Despesas</Text>
        </View>
      </View>

      {/* Usage (for non-premium) */}
      {plan?.plan_type !== 'premium' && plan?.limits && (
        <View style={styles.usageCard}>
          <Text style={styles.sectionTitle}>Uso do Plano</Text>
          
          <View style={styles.usageItem}>
            <Text style={styles.usageLabel}>📝 Transações</Text>
            <Text style={styles.usageValue}>
              {plan.current_usage?.transactions || 0} / 
              {plan.limits.transactions_per_month === -1 ? '∞' : plan.limits.transactions_per_month}
            </Text>
          </View>

          <View style={styles.usageItem}>
            <Text style={styles.usageLabel}>💬 Mensagens IA</Text>
            <Text style={styles.usageValue}>
              {plan.current_usage?.ai_messages || 0} / 
              {plan.limits.ai_messages_per_month === -1 ? '∞' : plan.limits.ai_messages_per_month}
            </Text>
          </View>

          <View style={styles.usageItem}>
            <Text style={styles.usageLabel}>💳 Cartões</Text>
            <Text style={styles.usageValue}>
              {plan.current_usage?.cards || 0} / 
              {plan.limits.max_cards === -1 ? '∞' : plan.limits.max_cards}
            </Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsCard}>
        {plan?.plan_type !== 'premium' && (
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>👑</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Fazer Upgrade</Text>
              <Text style={styles.actionSubtitle}>Desbloqueie recursos premium</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
          <Text style={styles.actionIcon}>🚪</Text>
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: colors.error }]}>Sair da Conta</Text>
            <Text style={styles.actionSubtitle}>Encerrar sessão</Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.memberId}>
        Membro desde {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'hoje'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  userHeader: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.xs,
  },
  planSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  planInfo: {},
  planLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  planName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  planExpiry: {
    alignItems: 'flex-end',
  },
  expiryLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  expiryDate: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  usageCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  usageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  usageLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  usageValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  actionsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  actionSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 24,
    color: colors.textMuted,
  },
  memberId: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
