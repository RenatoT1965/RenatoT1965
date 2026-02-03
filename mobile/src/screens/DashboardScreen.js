import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import API_URL from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

export default function DashboardScreen({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.subtitle}>Visão geral das suas finanças</Text>
        </View>
      </View>

      {/* Balance Card */}
      <LinearGradient
        colors={[colors.primary, '#059669']}
        style={styles.balanceCard}
      >
        <Text style={styles.balanceLabel}>Saldo Atual</Text>
        <Text style={styles.balanceValue}>{formatCurrency(summary?.balance)}</Text>
      </LinearGradient>

      {/* Income/Expense Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.incomeCard]}>
          <Text style={styles.statLabel}>Receitas do Mês</Text>
          <Text style={[styles.statValue, { color: colors.income }]}>
            {formatCurrency(summary?.total_income)}
          </Text>
        </View>
        <View style={[styles.statCard, styles.expenseCard]}>
          <Text style={styles.statLabel}>Despesas do Mês</Text>
          <Text style={[styles.statValue, { color: colors.expense }]}>
            {formatCurrency(summary?.total_expenses)}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Transactions')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
              <Text style={styles.actionEmoji}>💰</Text>
            </View>
            <Text style={styles.actionText}>Receita</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Transactions')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
              <Text style={styles.actionEmoji}>💸</Text>
            </View>
            <Text style={styles.actionText}>Despesa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Cards')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E0E7FF' }]}>
              <Text style={styles.actionEmoji}>💳</Text>
            </View>
            <Text style={styles.actionText}>Cartões</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AIAssistant')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.actionEmoji}>🤖</Text>
            </View>
            <Text style={styles.actionText}>IA</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Budget Progress */}
      {summary?.budgets_status?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metas</Text>
          {summary.budgets_status.map((budget) => (
            <View key={budget.id} style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <Text style={styles.budgetName}>{budget.name}</Text>
                <Text style={[
                  styles.budgetPercentage,
                  budget.exceeded && { color: colors.error }
                ]}>
                  {Math.round(budget.percentage)}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(budget.percentage, 100)}%`,
                      backgroundColor: budget.exceeded ? colors.error : colors.primary
                    }
                  ]}
                />
              </View>
              <Text style={styles.budgetValues}>
                {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Transactions */}
      {summary?.recent_transactions?.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transações Recentes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.seeAll}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          {summary.recent_transactions.slice(0, 5).map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDesc}>{transaction.description}</Text>
                <Text style={styles.transactionDate}>
                  {new Date(transaction.date).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <Text style={[
                styles.transactionAmount,
                { color: transaction.type === 'income' ? colors.income : colors.expense }
              ]}>
                {transaction.type === 'income' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}
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
  header: {
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  balanceCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  balanceValue: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
  },
  incomeCard: {
    borderColor: '#D1FAE5',
    backgroundColor: '#F0FDF4',
  },
  expenseCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  seeAll: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  budgetCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  budgetName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  budgetPercentage: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetValues: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  transactionDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
