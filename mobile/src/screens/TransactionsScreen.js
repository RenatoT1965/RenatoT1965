import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import API_URL from '../services/api';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

export default function TransactionsScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, income, expense

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const loadTransactions = async () => {
    try {
      const params = filter !== 'all' ? `?type=${filter}` : '';
      const response = await axios.get(`${API_URL}/transactions${params}`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const renderTransaction = ({ item }) => (
    <TouchableOpacity style={styles.transactionCard}>
      <View style={[
        styles.typeIndicator,
        { backgroundColor: item.type === 'income' ? colors.income : colors.expense }
      ]} />
      <View style={styles.transactionContent}>
        <View style={styles.transactionMain}>
          <Text style={styles.transactionDesc}>{item.description}</Text>
          <Text style={[
            styles.transactionAmount,
            { color: item.type === 'income' ? colors.income : colors.expense }
          ]}>
            {item.type === 'income' ? '+' : '-'}
            {formatCurrency(item.amount)}
          </Text>
        </View>
        <View style={styles.transactionMeta}>
          <Text style={styles.transactionDate}>
            {new Date(item.date).toLocaleDateString('pt-BR')}
          </Text>
          <Text style={styles.transactionMethod}>
            {item.payment_method === 'credit_card' ? '💳 Cartão' :
             item.payment_method === 'pix' ? '📱 PIX' :
             item.payment_method === 'cash' ? '💵 Dinheiro' : '🏦 Outros'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Todas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'income' && styles.filterTabActive]}
          onPress={() => setFilter('income')}
        >
          <Text style={[styles.filterText, filter === 'income' && styles.filterTextActive]}>
            Receitas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'expense' && styles.filterTabActive]}
          onPress={() => setFilter('expense')}
        >
          <Text style={[styles.filterText, filter === 'expense' && styles.filterTextActive]}>
            Despesas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyText}>Nenhuma transação encontrada</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFF',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  typeIndicator: {
    width: 4,
  },
  transactionContent: {
    flex: 1,
    padding: spacing.md,
  },
  transactionMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionDesc: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
    marginRight: spacing.sm,
  },
  transactionAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  transactionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  transactionDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  transactionMethod: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
});
