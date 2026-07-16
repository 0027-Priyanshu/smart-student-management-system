import { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Sparkles, BrainCircuit, ShieldAlert, FileText, TrendingUp } from 'lucide-react';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { CardSkeleton } from '../components/Skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

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
  const [isSpeaking, setIsSpeaking] = useState(true); // Voice output enabled by default
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  // Load students for profiler (Admin only)
  useEffect(() => {
    if (isAdmin) {
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
  }, [isAdmin]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatLoading) return;

    const userMsg = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', parts: [userMsg] }]);
    setChatLoading(true);

    try {
      // Send chat history format to backend
      const res = await api.post('/ai/chat', {
        message: userMsg,
        history: messages
      });

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
      const token = localStorage.getItem('accessToken');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      window.open(`${apiBase}/ai/report/${studentId}/pdf?token=${token}`, '_blank');
    } catch (err) {
      console.error(err);
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
      <div className="flex border-b border-white/5 mb-8 overflow-x-auto scrollbar-none whitespace-nowrap">
        {!isStudent && (
          <button 
            onClick={() => setActiveTab('chat')} 
            className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'chat' ? 'border-[#8a5cf6] text-[#8a5cf6]' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            AI Chat Companion
          </button>
        )}
        <button 
          onClick={() => setActiveTab('profiler')} 
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'profiler' ? 'border-[#8a5cf6] text-[#8a5cf6]' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          {isStudent ? 'Your AI Profile Analyzer' : 'Student Performance Analyzer'}
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('insights')} 
            className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'insights' ? 'border-[#8a5cf6] text-[#8a5cf6]' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            Strategic Admin Insights
          </button>
        )}
      </div>

      {/* Tab 1: Direct Chat interface */}
      {activeTab === 'chat' && (
        <div className="flex flex-col h-[600px] bg-[#12141c]/50 border border-white/5 rounded-3xl overflow-hidden shadow-card">
          {/* Header area */}
          <div className="p-4 bg-white/2 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-[#8a5cf6] to-[#06b6d4] rounded-xl flex items-center justify-center text-white shadow-glow">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-title font-extrabold text-sm text-white">EduManager AI</h3>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Online & Connected</p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsSpeaking(!isSpeaking)}
              className={`p-2 rounded-lg transition-all ${isSpeaking ? 'text-[#06b6d4] bg-[#06b6d4]/10' : 'text-gray-500 bg-white/5'}`}
              title="Toggle AI Voice Response"
            >
              {isSpeaking ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 scrollbar-thin">
            {messages.map((msg, idx) => {
              const isAI = msg.role === 'model';
              return (
                <div key={idx} className={`flex gap-3.5 max-w-[90%] md:max-w-[80%] ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${isAI ? 'bg-[#8a5cf6]/20 text-[#8a5cf6]' : 'bg-[#06b6d4]/20 text-[#06b6d4]'}`}>
                    {isAI ? <Bot size={16} /> : <User size={16} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-xs leading-normal border overflow-x-auto prose prose-invert max-w-none ${
                    isAI ? 'bg-white/2 border-white/5 text-gray-300' : 'bg-[#8a5cf6]/10 border-[#8a5cf6]/20 text-white'
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
                <div className="h-8 w-8 rounded-full bg-[#8a5cf6]/20 text-[#8a5cf6] flex items-center justify-center animate-pulse">
                  <Bot size={16} />
                </div>
                <div className="flex gap-1.5 p-3 rounded-xl bg-white/2 border border-white/5">
                  <span className="h-1.5 w-1.5 bg-[#8a5cf6] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 bg-[#8a5cf6] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 bg-[#8a5cf6] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Form */}
          <form onSubmit={handleSendMessage} className="p-4 bg-white/2 border-t border-white/5 flex gap-3">
            <button
              type="button"
              onClick={toggleListen}
              className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {isListening ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <input
              type="text"
              placeholder="Ask me something..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 px-4 py-3 bg-[#0b0c10]/80 border border-white/5 focus:border-[#8a5cf6] rounded-xl text-xs text-white focus:outline-none transition-all"
            />
            <button 
              type="submit" 
              className="px-4.5 bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4] text-white font-bold rounded-xl text-xs shadow-card flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Student Performance Profiler */}
      {activeTab === 'profiler' && (
        <div className="space-y-6">
          {/* Student Selector (Admin only) */}
          {isAdmin && (
            <div className="p-5 bg-[#12141c]/50 border border-white/5 rounded-3xl flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => {
                  setSelectedStudent(e.target.value);
                  handleAnalyzeStudent(e.target.value);
                }}
                className="px-3 py-2.5 bg-white/2 border border-white/5 focus:border-[#8a5cf6] rounded-xl text-xs text-gray-300 focus:outline-none cursor-pointer min-w-[200px]"
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
            <div className="p-10 bg-[#12141c]/50 border border-white/5 rounded-3xl text-center text-gray-500 italic text-xs">
              Select a student to generate their AI Performance analysis card.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Summary and weak subjects */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Academic Profile summary */}
                <div className="p-6 bg-[#12141c]/50 border border-white/5 rounded-3xl shadow-card relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-16 w-16 bg-[#8a5cf6]/5 rounded-full filter blur-xl" />
                  
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-title font-extrabold text-base text-white flex items-center gap-2">
                      <BrainCircuit size={18} className="text-[#8a5cf6]" />
                      AI Academic Summary Profile
                    </h4>
                    <div className="flex gap-2">
                      {isAdmin && riskData && (riskData.riskLevel === 'Medium' || riskData.riskLevel === 'High') && (
                        <button
                          onClick={handleSendParentEmail}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all text-[10px] font-bold"
                        >
                          Notify Parent (AI)
                        </button>
                      )}
                      <button
                        onClick={downloadPDFReport}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#8a5cf6]/10 hover:bg-[#8a5cf6] text-[#8a5cf6] hover:text-white rounded-xl border border-[#8a5cf6]/20 transition-all text-[10px] font-bold"
                      >
                        <FileText size={12} />
                        Export PDF
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Summary Text */}
                    <div className="text-sm text-gray-200 leading-relaxed bg-white/5 p-6 rounded-2xl border border-white/10 font-sans shadow-inner prose prose-invert prose-p:text-gray-300 prose-headings:text-white prose-strong:text-[#06b6d4] prose-li:text-gray-300 max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {summary}
                      </ReactMarkdown>
                    </div>

                    {/* Historical Trend Chart */}
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner flex flex-col">
                      <h5 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                        <TrendingUp size={16} className="text-[#10b981]" />
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
                              <Line type="monotone" dataKey="gpa" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#12141c', stroke: '#10b981', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={true} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-gray-500 italic">No trend data available.</div>
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
                <div className="p-6 bg-[#12141c]/50 border border-white/5 rounded-3xl shadow-card">
                  <h4 className="font-title font-extrabold text-base mb-4 text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-[#06b6d4]" />
                    Personalized Study Recommendations
                  </h4>
                  <div className="space-y-3">
                    {recommendations.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No recommendations mapped.</p>
                    ) : (
                      recommendations.map((rec, idx) => (
                        <div key={idx} className="flex gap-3 p-3 bg-white/2 rounded-xl border border-white/5 text-xs text-gray-300 font-semibold leading-normal items-start">
                          <span className="h-5 w-5 rounded-full bg-[#06b6d4]/15 border border-[#06b6d4]/20 text-[#06b6d4] flex items-center justify-center text-[10px] font-bold shrink-0">{idx + 1}</span>
                          <span>{rec}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Side panel: warnings */}
              <div className="lg:col-span-1 space-y-6">
                <div className="p-6 bg-[#12141c]/50 border border-white/5 rounded-3xl shadow-card h-full">
                  <h4 className="font-title font-extrabold text-base mb-4 text-white flex items-center gap-2">
                    <ShieldAlert size={18} className="text-[#ef4444]" />
                    AI Alert Center
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 block mb-2">Weak Subjects Detected</span>
                      {weakSubjects.length === 0 ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#10b981]/10 text-[#10b981] font-semibold border border-[#10b981]/25 text-[10px] uppercase">
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

                    <div className="pt-4 border-t border-white/5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 block mb-1">Target Standing Goal</span>
                      <p className="text-xs text-gray-400 leading-normal">
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

      {/* Tab 3: Strategic Admin Insights (Admin only) */}
      {activeTab === 'insights' && isAdmin && (
        <div className="space-y-6">
          <div className="p-6 bg-[#12141c]/50 border border-white/5 rounded-3xl shadow-card relative overflow-hidden">
            <div className="absolute top-0 right-0 h-28 w-28 bg-[#8a5cf6]/5 rounded-full filter blur-2xl" />

            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-title font-extrabold text-base text-white flex items-center gap-2">
                  <FileText size={18} className="text-[#8a5cf6]" />
                  AI Strategic Insight Report
                </h4>
                <p className="text-[10px] text-gray-500 mt-1 uppercase font-semibold">Generates real-time institute-wide evaluation and targets</p>
              </div>

              <button
                onClick={handleGenerateInsights}
                disabled={insightsLoading}
                className="px-4 py-2.5 bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4] text-white font-bold rounded-xl text-xs hover:shadow-glow transition-all"
              >
                {insightsLoading ? 'Generating report...' : 'Generate New Insights'}
              </button>
            </div>

            {insightsLoading ? (
              <CardSkeleton />
            ) : !insights ? (
              <div className="p-10 text-center text-gray-500 italic text-xs bg-white/2 rounded-2xl border border-white/5">
                Click the button to evaluate MERN analytics metrics via Gemini and produce objectives.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-5 bg-white/2 border border-white/5 rounded-2xl text-xs text-gray-300 leading-relaxed font-medium prose prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {insights}
                  </ReactMarkdown>
                </div>

                {/* Recharts - AI Trend Graph */}
                {chartData && chartData.length > 0 && (
                  <div className="p-5 bg-white/2 border border-white/5 rounded-2xl h-72">
                    <h5 className="font-title font-extrabold text-sm mb-4 text-white">AI Projected Trend (GPA vs Attendance)</h5>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="month" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" stroke="#8a5cf6" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#12141c', borderColor: '#ffffff10', borderRadius: '12px', fontSize: '12px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Line yAxisId="left" type="monotone" dataKey="gpa" stroke="#8a5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Avg GPA" />
                        <Line yAxisId="right" type="monotone" dataKey="attendance" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Attendance %" />
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
