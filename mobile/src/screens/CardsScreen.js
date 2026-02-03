import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import API_URL from '../services/api';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

const BANK_COLORS = {
  'nubank': ['#820AD1', '#9B30FF'],
  'inter': ['#FF7A00', '#FF9500'],
  'itau': ['#003366', '#004D99'],
  'bradesco': ['#CC092F', '#E60026'],
  'santander': ['#EC0000', '#FF1919'],
  'default': ['#64748B', '#94A3B8'],
};

const getBankGradient = (cardName) => {
  const name = cardName?.toLowerCase() || '';
  for (const [bank, gradient] of Object.entries(BANK_COLORS)) {
    if (name.includes(bank)) return gradient;
  }
  return BANK_COLORS.default;
};

export default function CardsScreen({ navigation }) {
  const [cards, setCards] = useState([]);
  const [invoices, setInvoices] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const cardsResponse = await axios.get(`${API_URL}/cards`);
      setCards(cardsResponse.data);

      const invoicesData = {};
      for (const card of cardsResponse.data) {
        if (card.active) {
          try {
            const invoiceResponse = await axios.get(`${API_URL}/cards/${card.id}/invoice`);
            invoicesData[card.id] = invoiceResponse.data;
          } catch (e) {
            console.error('Error loading invoice:', e);
          }
        }
      }
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCards();
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
      {cards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💳</Text>
          <Text style={styles.emptyText}>Nenhum cartão cadastrado</Text>
          <Text style={styles.emptySubtext}>
            Adicione seu primeiro cartão pelo app web
          </Text>
        </View>
      ) : (
        cards.filter(c => c.active).map((card) => {
          const invoice = invoices[card.id];
          const usedAmount = invoice?.used_amount || 0;
          const usagePercentage = card.credit_limit > 0 
            ? (usedAmount / card.credit_limit) * 100 
            : 0;

          return (
            <View key={card.id} style={styles.cardWrapper}>
              <LinearGradient
                colors={getBankGradient(card.name)}
                style={styles.cardHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeaderTop}>
                  <View>
                    <Text style={styles.cardType}>Cartão de Crédito</Text>
                    <Text style={styles.cardName}>{card.name}</Text>
                  </View>
                  <Text style={styles.cardIcon}>💳</Text>
                </View>
                <View style={styles.cardNumber}>
                  <Text style={styles.cardDigits}>•••• {card.last_four_digits}</Text>
                  <Text style={styles.cardBrand}>{card.brand?.toUpperCase()}</Text>
                </View>
              </LinearGradient>

              <View style={styles.cardBody}>
                <View style={styles.limitSection}>
                  <Text style={styles.limitLabel}>Limite Utilizado</Text>
                  <Text style={styles.limitValue}>
                    {formatCurrency(usedAmount)} / {formatCurrency(card.credit_limit)}
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(usagePercentage, 100)}%`,
                          backgroundColor: usagePercentage > 80 ? colors.error : colors.primary
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.limitPercentage}>
                    {usagePercentage.toFixed(1)}% do limite
                  </Text>
                </View>

                <View style={styles.datesRow}>
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>📅 Fecha dia</Text>
                    <Text style={styles.dateValue}>{card.closing_day}</Text>
                  </View>
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>⚠️ Vence dia</Text>
                    <Text style={styles.dateValue}>{card.due_day}</Text>
                  </View>
                </View>

                <View style={styles.invoiceSection}>
                  <Text style={styles.invoiceLabel}>Fatura Atual</Text>
                  <Text style={styles.invoiceValue}>{formatCurrency(usedAmount)}</Text>
                  <Text style={styles.invoiceCount}>
                    {invoice?.total_transactions || 0} transações
                  </Text>
                </View>
              </View>
            </View>
          );
        })
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  cardWrapper: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    padding: spacing.lg,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardType: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  cardName: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 2,
  },
  cardIcon: {
    fontSize: 32,
  },
  cardNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardDigits: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  cardBrand: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  cardBody: {
    padding: spacing.lg,
  },
  limitSection: {
    marginBottom: spacing.lg,
  },
  limitLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  limitValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
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
  limitPercentage: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  datesRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  dateValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  invoiceSection: {
    alignItems: 'center',
  },
  invoiceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  invoiceValue: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginVertical: spacing.xs,
  },
  invoiceCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
