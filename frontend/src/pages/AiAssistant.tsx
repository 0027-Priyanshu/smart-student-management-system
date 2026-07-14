import { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Sparkles, BrainCircuit, ShieldAlert, FileText } from 'lucide-react';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { CardSkeleton } from '../components/Skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Student Profiler state
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [summary, setSummary] = useState('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [weakSubjects, setWeakSubjects] = useState<string[]>([]);
  const [profilerLoading, setProfilerLoading] = useState(false);

  // Insights state
  const [insights, setInsights] = useState('');
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

      setMessages(prev => [...prev, { role: 'model', parts: [res.data.reply] }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', parts: ['Sorry, I encountered an issue connecting to the AI brain. Please try again.'] }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleAnalyzeStudent = async (studentId: string) => {
    if (!studentId) return;
    setProfilerLoading(true);
    setSummary('');
    setRecommendations([]);
    setWeakSubjects([]);

    try {
      const [summaryRes, recRes] = await Promise.all([
        api.get(`/ai/student-summary/${studentId}`),
        api.get(`/ai/student-recommendations/${studentId}`)
      ]);

      setSummary(summaryRes.data.summary);
      setRecommendations(recRes.data.recommendations || []);
      setWeakSubjects(recRes.data.weakSubjects || []);
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
      setInsights(res.data.insights);
    } catch (err) {
      console.error(err);
      setInsights('Failed to generate insights report. Please try again.');
    } finally {
      setInsightsLoading(false);
    }
  };

  const downloadPDFReport = () => {
    const studentId = selectedStudent || user?.studentProfile?._id || user?.studentProfile?.id;
    if (!studentId) return;
    const token = localStorage.getItem('accessToken');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    window.open(`${apiBase}/ai/report/${studentId}/pdf?token=${token}`, '_blank');
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

      {/* Tab 1: AI Chat Companion */}
      {activeTab === 'chat' && !isStudent && (
        <div className="bg-[#12141c]/50 border border-white/5 rounded-3xl overflow-hidden shadow-card flex flex-col h-[520px]">
          {/* Header */}
          <div className="p-4 bg-white/2 border-b border-white/5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#8a5cf6]/10 flex items-center justify-center text-[#8a5cf6]">
              <Bot size={20} />
            </div>
            <div>
              <h4 className="font-title font-bold text-sm text-white">EduManager Assistant</h4>
              <p className="text-[10px] text-gray-500 font-semibold uppercase">Powered by Google Gemini</p>
            </div>
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
                    <button
                      onClick={downloadPDFReport}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#8a5cf6]/10 hover:bg-[#8a5cf6] text-[#8a5cf6] hover:text-white rounded-xl border border-[#8a5cf6]/20 transition-all text-[10px] font-bold"
                    >
                      <FileText size={12} />
                      Export PDF
                    </button>
                  </div>
                  <div className="text-xs text-gray-300 leading-relaxed bg-white/2 p-4 rounded-2xl border border-white/5 font-medium prose prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {summary}
                    </ReactMarkdown>
                  </div>
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
              <div className="p-5 bg-white/2 border border-white/5 rounded-2xl text-xs text-gray-300 leading-relaxed font-medium prose prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {insights}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}

    </DashboardShell>
  );
}
