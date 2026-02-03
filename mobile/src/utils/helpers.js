export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

export const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

export const formatDateTime = (dateStr) => {
  return new Date(dateStr).toLocaleString('pt-BR');
};
