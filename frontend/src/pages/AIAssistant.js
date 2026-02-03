import { useState, useEffect, useRef } from 'react';
import { API, axios, toast } from '../config';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Send, Bot, User, Sparkles, TrendingUp, AlertTriangle, Info } from 'lucide-react';

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadInsights();
    loadAnalysis();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadInsights = async () => {
    try {
      const response = await axios.get(`${API}/ai/insights`);
      setInsights(response.data.insights || []);
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const loadAnalysis = async () => {
    try {
      const response = await axios.get(`${API}/ai/analysis`);
      setAnalysis(response.data);
    } catch (error) {
      console.error('Error loading analysis:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    setLoading(true);
    try {
      const response = await axios.post(`${API}/ai/chat`, {
        message: userMessage,
        include_context: true
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(response.data.timestamp)
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type) => {
    switch(type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'success': return <TrendingUp className="w-5 h-5 text-emerald-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getInsightColor = (type) => {
    switch(type) {
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'success': return 'bg-emerald-50 border-emerald-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  const suggestedQuestions = [
    "Quanto gastei com alimentação este mês?",
    "Posso economizar em alguma categoria?",
    "Estou gastando muito?",
    "Como melhorar minhas finanças?"
  ];

  return (
    <div className="space-y-6" data-testid="ai-assistant-page">
      <div>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground flex items-center gap-3">
          <Sparkles className="w-10 h-10 text-primary" />
          Assistente Financeiro IA
        </h1>
        <p className="text-muted-foreground mt-2">
          Converse com seu assistente inteligente e receba insights personalizados
        </p>
      </div>

      {/* AI Insights Cards */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              data-testid={`insight-${index}`}
              className={`p-4 rounded-xl border-2 ${getInsightColor(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">{insight.title}</h3>
                  <p className="text-sm text-slate-700">{insight.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Spending Analysis */}
      {analysis && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
          <h2 className="text-xl font-heading font-semibold mb-4 flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            Análise Inteligente dos seus Gastos
          </h2>
          
          {analysis.summary && (
            <div className="mb-4 p-4 bg-primary/5 rounded-lg">
              <p className="text-slate-800 font-medium">{analysis.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {analysis.patterns && analysis.patterns.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-2">📊 Padrões Identificados</h3>
                <ul className="space-y-1">
                  {analysis.patterns.map((pattern, idx) => (
                    <li key={idx} className="text-sm text-slate-600">• {pattern}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.alerts && analysis.alerts.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-amber-700 mb-2">⚠️ Alertas</h3>
                <ul className="space-y-1">
                  {analysis.alerts.map((alert, idx) => (
                    <li key={idx} className="text-sm text-slate-600">• {alert}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.opportunities && analysis.opportunities.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-emerald-700 mb-2">💡 Oportunidades</h3>
                <ul className="space-y-1">
                  {analysis.opportunities.map((opp, idx) => (
                    <li key={idx} className="text-sm text-slate-600">• {opp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-accent p-4">
          <h2 className="text-xl font-heading font-semibold text-white flex items-center gap-2">
            <Bot className="w-6 h-6" />
            Chat com Assistente
          </h2>
        </div>

        <div className="h-[500px] overflow-y-auto p-6 space-y-4" data-testid="chat-messages">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-6">Olá! Sou seu assistente financeiro. Como posso ajudar?</p>
              
              <div className="space-y-2">
                <p className="text-sm text-slate-500 font-medium">Perguntas sugeridas:</p>
                {suggestedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(question)}
                    className="block w-full max-w-md mx-auto text-left px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm text-slate-700 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-white/70' : 'text-slate-500'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-slate-100 p-4 rounded-2xl">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="border-t border-border p-4">
          <div className="flex gap-2">
            <Textarea
              data-testid="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte algo sobre suas finanças..."
              className="flex-1 resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
            />
            <Button
              type="submit"
              data-testid="send-message-btn"
              disabled={loading || !input.trim()}
              className="bg-primary hover:bg-primary/90 h-auto px-6"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Pressione Enter para enviar, Shift+Enter para nova linha
          </p>
        </form>
      </div>
    </div>
  );
}
