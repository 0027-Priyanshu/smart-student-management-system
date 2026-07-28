import { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Sparkles, BrainCircuit, ShieldAlert, FileText, TrendingUp, Mic, MicOff, Volume2, VolumeX, Trash2, Lightbulb } from 'lucide-react';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { CardSkeleton } from '../components/Skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SUGGESTED_PROMPTS = [
  {
    category: 'Academic',
    icon: '📚',
    prompts: [
      "Summarise today's attendance.",
      "Which students are at risk?",
      "Show low-performing students.",
      "Analyse class performance.",
      "Generate a progress report."
    ]
  },
  {
    category: 'Administrative',
    icon: '📋',
    prompts: [
      "Create a student report.",
      "Generate a leave application.",
      "Find a student by ID.",
      "Show fee status.",
      "Export attendance."
    ]
  },
  {
    category: 'AI Analytics',
    icon: '⚡',
    prompts: [
      "Predict students who may fail.",
      "Explain attendance trends.",
      "Compare semester performance.",
      "Suggest interventions.",
      "Generate strategic insights."
    ]
  },
  {
    category: 'General',
    icon: '💡',
    prompts: [
      "What can you help me with?",
      "Show dashboard summary.",
      "Explain today's statistics.",
      "Give system recommendations.",
      "Help me manage students."
    ]
  }
];

interface ChatMessage {
  role: 'user' | 'model';
  parts: string[];
}

export default function AiAssistant() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';
  const isStudent = user?.role === 'Student';

  const [activeTab, setActiveTab] = useState<'chat' | 'profiler' | 'insights'>(isStudent ? 'profiler' : 'chat');
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', parts: ['Hello! I am your EduManager AI Assistant. I can answer system questions, explain grade averages, or search attendance details. How can I help you today?'] }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleSelectPrompt = (promptText: string) => {
    setInputMessage(promptText);
    handleSendMessage(promptText);
  };

  // Student Profiler state
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [summary, setSummary] = useState('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [weakSubjects, setWeakSubjects] = useState<string[]>([]);
  const [riskData, setRiskData] = useState<{ riskScore: number; warningMessage: string; riskLevel: string } | null>(null);
  const [profilerLoading, setProfilerLoading] = useState(false);

  // Insights state
  const [insights, setInsights] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const canSelectStudent = isAdmin || user?.role === 'Faculty';

  // Load students for profiler (Admin and Faculty)
  useEffect(() => {
    if (canSelectStudent) {
      async function getStudents() {
        try {
          const res = await api.get('/students?limit=200');
          setStudents(res.data.students || []);
        } catch (err) {
          console.error(err);
        }
      }
      getStudents();
    }
  }, [canSelectStudent]);

  // Load student profile recommendations directly on mount (Student only)
  useEffect(() => {
    if (isStudent && user) {
      const sId = user.studentProfile?._id || user.studentProfile?.id || user.userId;
      handleAnalyzeStudent(sId);
    }
  }, [isStudent, user]);

  // Load chat history
  useEffect(() => {
    async function loadChatHistory() {
      try {
        const res = await api.get('/ai/chat-history');
        if (res.data.history && res.data.history.length > 0) {
          const formattedHistory = res.data.history.map((msg: any) => ({
            role: msg.role,
            parts: [msg.content]
          }));
          setMessages(formattedHistory);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    }
    loadChatHistory();
  }, []);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent | string, customText?: string) => {
    if (e && typeof e !== 'string') e.preventDefault();
    const query = typeof e === 'string' ? e : customText || inputMessage;
    if (!query.trim() || chatLoading) return;

    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', parts: [query] }]);
    setChatLoading(true);

    try {
      // Send chat history format to backend
      const chatPayload = messages.concat({ role: 'user', parts: [query] }).map(m => ({
        role: m.role,
        parts: [{ text: m.parts.join('\n') }]
      }));

      const res = await api.post('/ai/chat', { messages: chatPayload });
      const reply = res.data.reply;
      setMessages(prev => [...prev, { role: 'model', parts: [reply] }]);

      if (isSpeaking) {
        speakText(reply);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', parts: ['Sorry, I encountered an issue connecting to the AI brain. Please try again.'] }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your AI conversation history and start a new chat?')) return;
    try {
      await api.delete('/ai/chat-history');
      setMessages([
        { role: 'model', parts: ['Hello! I am your EduManager AI Assistant. I can answer system questions, explain grade averages, or search attendance details. How can I help you today?'] }
      ]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const toggleListen = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAnalyzeStudent = async (studentId: string) => {
    if (!studentId) return;
    setProfilerLoading(true);
    setSummary('');
    setRecommendations([]);
    setWeakSubjects([]);
    setRiskData(null);
    try {
      const [summaryRes, recRes, riskRes] = await Promise.all([
        api.get(`/ai/student-summary/${studentId}`),
        api.get(`/ai/student-recommendations/${studentId}`),
        api.get(`/ai/predict-risk/${studentId}`)
      ]);

      setSummary(summaryRes.data.summary);
      setTrendData(summaryRes.data.trendData || []);
      setRecommendations(recRes.data.recommendations || []);
      setWeakSubjects(recRes.data.weakSubjects || []);
      setRiskData(riskRes.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setProfilerLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    setInsightsLoading(true);
    setInsights('');
    try {
      const res = await api.get('/ai/academic-insights');
      setInsights(res.data.insights || '');
      setChartData(res.data.chartData || []);
    } catch (err) {
      console.error(err);
      setInsights('Failed to generate insights report. Please try again.');
    } finally {
      setInsightsLoading(false);
    }
  };

  const downloadPDFReport = async () => {
    if (!selectedStudent && !isStudent) return;
    const studentId = selectedStudent || user?.studentProfile?._id || user?.studentProfile?.id || user?.userId;
    try {
      const response = await api.get(`/ai/report/${studentId}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AI_Academic_Report_${studentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF Report Download failed:', err);
    }
  };

  const handleSendParentEmail = async () => {
    if (!selectedStudent) return;
    try {
      const res = await api.post(`/ai/generate-parent-email/${selectedStudent}`);
      alert(res.data.message + '\n\nDraft:\n' + res.data.content);
    } catch (err) {
      console.error(err);
      alert('Failed to send email to parent.');
    }
  };

  return (
    <DashboardShell title="AI Academic Assistant">
      
      {/* Dynamic Tab Switchers */}
      <div className="flex border-b border-slate-200 mb-8 overflow-x-auto scrollbar-none whitespace-nowrap">
        {!isStudent && (
          <button 
            onClick={() => setActiveTab('chat')} 
            className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'chat' ? 'border-[#f97316] text-[#f97316]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            AI Chat Companion
          </button>
        )}
        <button 
          onClick={() => setActiveTab('profiler')} 
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'profiler' ? 'border-[#f97316] text-[#f97316]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
        >
          {isStudent ? 'Your AI Profile Analyzer' : 'Student Performance Analyzer'}
        </button>
        {canSelectStudent && (
          <button 
            onClick={() => setActiveTab('insights')} 
            className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'insights' ? 'border-[#f97316] text-[#f97316]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            Strategic Academic Insights
          </button>
        )}
      </div>

      {/* Tab 1: Direct Chat interface */}
      {activeTab === 'chat' && (
        <div className="flex flex-col h-[600px] bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-card">
          {/* Header area */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-[#f97316] to-[#ef4444] rounded-xl flex items-center justify-center text-slate-900 shadow-glow">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-title font-extrabold text-sm text-slate-900">EduManager AI</h3>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Online & Connected</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowSuggestions(!showSuggestions)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${showSuggestions ? 'text-[#f97316] bg-[#f97316]/10 border-[#f97316]/20' : 'text-slate-600 bg-slate-100 border-slate-200 hover:bg-slate-200'}`}
                title="Toggle Suggested Starter Prompts"
              >
                <Lightbulb size={14} />
                <span>Suggestions</span>
              </button>
              <button 
                onClick={handleClearHistory}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-red-50 hover:text-red-600 border border-slate-200 transition-all flex items-center gap-1.5"
                title="Clear conversation history & start a new chat"
              >
                <Trash2 size={14} />
                <span>New Chat</span>
              </button>
              <button 
                onClick={() => setIsSpeaking(!isSpeaking)}
                className={`p-2 rounded-xl transition-all ${isSpeaking ? 'text-[#f97316] bg-[#f97316]/10 border border-[#f97316]/20' : 'text-slate-400 bg-slate-100 border border-slate-200'}`}
                title="Toggle AI Voice Response"
              >
                {isSpeaking ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 scrollbar-thin">
            {/* Suggested Starter Prompts Panel */}
            {showSuggestions && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-4 animate-fadeIn">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Lightbulb size={16} className="text-[#f97316]" />
                    Suggested Starter Prompts
                  </span>
                  <button 
                    onClick={() => setShowSuggestions(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase tracking-wider"
                  >
                    Hide
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {SUGGESTED_PROMPTS.map((cat, cIdx) => (
                    <div key={cIdx} className="space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                        {cat.icon} {cat.category}
                      </span>
                      <div className="space-y-1">
                        {cat.prompts.map((pText, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => handleSelectPrompt(pText)}
                            className="w-full text-left p-2 bg-white hover:bg-orange-50 hover:text-[#f97316] border border-slate-200 hover:border-[#f97316]/40 rounded-xl text-[11px] font-medium text-slate-700 transition-all truncate block shadow-2xs cursor-pointer"
                          >
                            {pText}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, idx) => {
              const isAI = msg.role === 'model';
              return (
                <div key={idx} className={`flex gap-3.5 max-w-[90%] md:max-w-[80%] ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${isAI ? 'bg-[#f97316]/20 text-[#f97316]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                    {isAI ? <Bot size={16} /> : <User size={16} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-xs leading-normal border overflow-x-auto prose prose-invert max-w-none ${
                    isAI ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#f97316]/10 border-[#f97316]/20 text-slate-900'
                  }`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.parts.join('\n')}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            })}
            {chatLoading && (
              <div className="flex gap-3.5 mr-auto max-w-[90%] md:max-w-[80%] items-center">
                <div className="h-8 w-8 rounded-full bg-[#f97316]/20 text-[#f97316] flex items-center justify-center animate-pulse">
                  <Bot size={16} />
                </div>
                <div className="flex gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="h-1.5 w-1.5 bg-[#f97316] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 bg-[#f97316] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 bg-[#f97316] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Form */}
          <form onSubmit={handleSendMessage} className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
            <button
              type="button"
              onClick={toggleListen}
              className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                isListening 
                  ? 'bg-red-500 text-slate-900 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                  : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-500 border border-slate-200'
              }`}
            >
              {isListening ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <input
              type="text"
              placeholder="Ask me something..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 px-4 py-3 bg-slate-50/80 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-xs text-slate-900 focus:outline-none transition-all"
            />
            <button 
              type="submit" 
              className="px-4.5 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-slate-900 font-bold rounded-xl text-xs shadow-card flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Student Performance Profiler */}
      {activeTab === 'profiler' && (
        <div className="space-y-6">
          {/* Student Selector (Admin and Faculty) */}
          {canSelectStudent && (
            <div className="p-5 bg-white border border-slate-200 rounded-3xl flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => {
                  setSelectedStudent(e.target.value);
                  handleAnalyzeStudent(e.target.value);
                }}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-xs text-slate-700 focus:outline-none cursor-pointer min-w-[200px]"
              >
                <option value="">-- Choose student --</option>
                {students.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.name} ({s.enrollmentNo})
                  </option>
                ))}
              </select>
            </div>
          )}

          {profilerLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <CardSkeleton />
                <CardSkeleton />
              </div>
              <div className="lg:col-span-1">
                <CardSkeleton />
              </div>
            </div>
          ) : !summary && !isStudent ? (
            <div className="p-10 bg-white border border-slate-200 rounded-3xl text-center text-slate-400 italic text-xs">
              Select a student to generate their AI Performance analysis card.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Summary and weak subjects */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Academic Profile summary */}
                <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-16 w-16 bg-[#f97316]/5 rounded-full filter blur-xl" />
                  
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-title font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <BrainCircuit size={18} className="text-[#f97316]" />
                      AI Academic Summary Profile
                    </h4>
                    <div className="flex gap-2">
                      {canSelectStudent && riskData && (riskData.riskLevel === 'Medium' || riskData.riskLevel === 'High') && (
                        <button
                          onClick={handleSendParentEmail}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-slate-900 rounded-xl border border-red-500/20 transition-all text-[10px] font-bold"
                        >
                          Notify Parent (AI)
                        </button>
                      )}
                      {!isStudent && (
                        <button
                          onClick={downloadPDFReport}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f97316]/10 hover:bg-[#f97316] text-[#f97316] hover:text-slate-900 rounded-xl border border-[#f97316]/20 transition-all text-[10px] font-bold cursor-pointer"
                        >
                          <FileText size={12} />
                          Export PDF
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Summary Text */}
                    <div className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-200 font-sans shadow-sm prose prose-slate prose-p:text-slate-800 prose-headings:text-slate-900 prose-strong:text-slate-900 prose-strong:font-bold prose-li:text-slate-800 max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {summary}
                      </ReactMarkdown>
                    </div>

                    {/* Historical Trend Chart */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                      <h5 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <TrendingUp size={16} className="text-[#eab308]" />
                        Historical GPA Trend
                      </h5>
                      <div className="flex-1 min-h-[200px]">
                        {trendData && trendData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                              <YAxis domain={[0, 4]} stroke="#6b7280" fontSize={11} />
                              <Tooltip contentStyle={{ backgroundColor: '#12141c', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                              <Line type="monotone" dataKey="gpa" stroke="#eab308" strokeWidth={3} dot={{ r: 4, fill: '#12141c', stroke: '#eab308', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={true} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No trend data available.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Risk Prediction Banner */}
                  {riskData && (
                    <div className={`mt-4 p-5 rounded-2xl border flex items-start gap-4 ${
                      riskData.riskLevel === 'High' 
                        ? 'bg-red-500/10 border-red-500/20' 
                        : riskData.riskLevel === 'Medium'
                        ? 'bg-amber-500/10 border-amber-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                      <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-lg ${
                        riskData.riskLevel === 'High' 
                          ? 'bg-red-500/20 text-red-500' 
                          : riskData.riskLevel === 'Medium'
                          ? 'bg-amber-500/20 text-amber-500'
                          : 'bg-emerald-500/20 text-emerald-500'
                      }`}>
                        {riskData.riskScore}%
                      </div>
                      <div>
                        <h5 className={`font-bold text-sm mb-1 ${
                          riskData.riskLevel === 'High' ? 'text-red-400' : riskData.riskLevel === 'Medium' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          AI Risk Prediction: {riskData.riskLevel}
                        </h5>
                        <p className={`text-xs ${
                          riskData.riskLevel === 'High' ? 'text-red-300' : riskData.riskLevel === 'Medium' ? 'text-amber-300' : 'text-emerald-300'
                        }`}>
                          {riskData.warningMessage}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card">
                  <h4 className="font-title font-extrabold text-base mb-4 text-slate-900 flex items-center gap-2">
                    <Sparkles size={18} className="text-[#ef4444]" />
                    Personalized Study Recommendations
                  </h4>
                  <div className="space-y-3">
                    {recommendations.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No recommendations mapped.</p>
                    ) : (
                      recommendations.map((rec, idx) => (
                        <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-semibold leading-normal items-start">
                          <span className="h-5 w-5 rounded-full bg-[#ef4444]/15 border border-[#ef4444]/20 text-[#ef4444] flex items-center justify-center text-[10px] font-bold shrink-0">{idx + 1}</span>
                          <span>{rec}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Side panel: warnings */}
              <div className="lg:col-span-1 space-y-6">
                <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card h-full">
                  <h4 className="font-title font-extrabold text-base mb-4 text-slate-900 flex items-center gap-2">
                    <ShieldAlert size={18} className="text-[#ef4444]" />
                    AI Alert Center
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">Weak Subjects Detected</span>
                      {weakSubjects.length === 0 ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#eab308]/10 text-[#eab308] font-semibold border border-[#eab308]/25 text-[10px] uppercase">
                          No Risk Found
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {weakSubjects.map((sub, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 rounded-lg text-[10px] font-bold">
                              {sub}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Target Standing Goal</span>
                      <p className="text-xs text-slate-500 leading-normal">
                        Focus 70% of weekly review hours on the weak subjects highlighted above to elevate overall CGPA levels.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Strategic Admin Insights */}
      {activeTab === 'insights' && canSelectStudent && (
        <div className="space-y-6">
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card relative overflow-hidden">
            <div className="absolute top-0 right-0 h-28 w-28 bg-[#f97316]/5 rounded-full filter blur-2xl" />

            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-title font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <FileText size={18} className="text-[#f97316]" />
                  AI Strategic Insight Report
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Generates real-time institute-wide evaluation and targets</p>
              </div>

              <button
                onClick={handleGenerateInsights}
                disabled={insightsLoading}
                className="px-4 py-2.5 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-slate-900 font-bold rounded-xl text-xs hover:shadow-glow transition-all"
              >
                {insightsLoading ? 'Generating report...' : 'Generate New Insights'}
              </button>
            </div>

            {insightsLoading ? (
              <CardSkeleton />
            ) : !insights ? (
              <div className="p-10 text-center text-slate-400 italic text-xs bg-slate-50 rounded-2xl border border-slate-200">
                Click the button to evaluate MERN analytics metrics via Gemini and produce objectives.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 leading-relaxed font-medium prose prose-slate prose-p:text-slate-800 prose-headings:text-slate-900 prose-strong:text-slate-900 prose-strong:font-bold prose-li:text-slate-800 max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {insights}
                  </ReactMarkdown>
                </div>

                {/* Recharts - AI Trend Graph */}
                {chartData && chartData.length > 0 && (
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl h-72">
                    <h5 className="font-title font-extrabold text-sm mb-4 text-slate-900">AI Projected Trend (GPA vs Attendance)</h5>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="month" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" stroke="#2563eb" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', color: '#0f172a', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        <Line yAxisId="left" type="monotone" dataKey="gpa" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} name="Avg GPA" />
                        <Line yAxisId="right" type="monotone" dataKey="attendance" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, fill: '#06b6d4' }} activeDot={{ r: 6 }} name="Attendance %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </DashboardShell>
  );
}
