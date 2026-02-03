import { useState } from 'react';
import { API, axios, toast } from '../config';
import { Button } from '../components/ui/button';
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';

export default function BankImport() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const extension = selectedFile.name.split('.').pop().toLowerCase();
      if (!['ofx', 'csv', 'pdf'].includes(extension)) {
        toast.error('Formato não suportado. Use OFX, CSV ou PDF');
        return;
      }
      setFile(selectedFile);
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/import/upload?auto_categorize=true&skip_duplicates=true`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setPreview(response.data);
      toast.success(`${response.data.total_found} transações encontradas!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Erro ao processar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!preview) return;

    setImporting(true);
    try {
      const response = await axios.post(`${API}/import/confirm?skip_duplicates=true`, preview.preview);
      
      toast.success(`✅ ${response.data.imported} transações importadas com sucesso!`);
      setPreview(null);
      setFile(null);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro ao importar transações');
    } finally {
      setImporting(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6" data-testid="bank-import-page">
      <div>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground flex items-center gap-3">
          <Upload className="w-10 h-10 text-primary" />
          Importar Extrato Bancário
        </h1>
        <p className="text-muted-foreground mt-2">
          Upload de OFX, CSV ou PDF - IA categoriza automaticamente
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">OFX</h3>
          </div>
          <p className="text-sm text-blue-800">
            Formato padrão dos bancos. Mais preciso e completo.
          </p>
        </div>

        <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-emerald-900">CSV/Excel</h3>
          </div>
          <p className="text-sm text-emerald-800">
            Exportação manual. Funciona com qualquer banco.
          </p>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-900">PDF</h3>
          </div>
          <p className="text-sm text-amber-800">
            Extrato em PDF. IA extrai as transações.
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-dashed border-border hover:border-primary transition-colors">
        <div className="text-center">
          <Upload className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          
          <input
            type="file"
            id="file-upload"
            data-testid="file-upload-input"
            accept=".ofx,.csv,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <label
            htmlFor="file-upload"
            className="cursor-pointer inline-block px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Selecionar Arquivo
          </label>

          {file && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg inline-block">
              <p className="text-sm font-medium text-slate-700">
                📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
              <Button
                data-testid="upload-btn"
                onClick={handleUpload}
                disabled={uploading}
                className="mt-3 bg-emerald-600 hover:bg-emerald-700"
              >
                {uploading ? 'Processando...' : 'Processar Arquivo'}
              </Button>
            </div>
          )}

          <p className="text-sm text-slate-500 mt-4">
            Funciona em <strong>PC, Android e Apple</strong> via navegador
          </p>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-accent p-6 text-white">
            <h2 className="text-2xl font-heading font-semibold mb-2">
              Pré-visualização da Importação
            </h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="opacity-80">Total Encontrado</p>
                <p className="text-2xl font-bold">{preview.total_found}</p>
              </div>
              <div>
                <p className="opacity-80">Novas Transações</p>
                <p className="text-2xl font-bold text-emerald-300">{preview.new_transactions}</p>
              </div>
              <div>
                <p className="opacity-80">Duplicatas</p>
                <p className="text-2xl font-bold text-amber-300">{preview.duplicates}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-slate-600">
                Mostrando primeiras {Math.min(preview.preview.length, 50)} transações
              </p>
              <Button
                data-testid="confirm-import-btn"
                onClick={handleConfirmImport}
                disabled={importing}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {importing ? 'Importando...' : `✓ Confirmar Importação (${preview.new_transactions})`}
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {preview.preview.map((transaction, index) => (
                <div
                  key={index}
                  data-testid={`preview-transaction-${index}`}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    transaction.is_duplicate
                      ? 'bg-amber-50 border border-amber-200'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {transaction.is_duplicate ? (
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        {transaction.category_id && ' • Categoria sugerida por IA'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      transaction.type === 'income'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                    <span className={`font-semibold ${
                      transaction.type === 'income' ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Como obter seu extrato?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <p className="font-semibold mb-1">Nubank:</p>
            <p>App → Extrato → ⚙️ → Exportar extrato → Escolha OFX</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Inter:</p>
            <p>App → Conta → Extrato → Exportar → OFX ou CSV</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Itaú/BB/Santander:</p>
            <p>Internet Banking → Extrato → Exportar → OFX ou CSV</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Outros bancos:</p>
            <p>Exportar como CSV ou PDF. IA vai processar!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
