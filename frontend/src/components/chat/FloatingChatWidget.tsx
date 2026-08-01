import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, Send, X, Sparkles, User, Volume2, VolumeX, Mic, MicOff, Copy, Check, ThumbsUp, ThumbsDown, Trash2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../utils/api';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../../stores/toastStore';
import { customMarkdownComponents } from '../../pages/AiAssistant';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  feedback?: 'helpful' | 'unhelpful';
}

export default function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuthStore();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      content: 'Hello! I am your EduManager AI Assistant. I can answer questions about the application, guide you through features, or look up student data. How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // Load page-aware suggested prompts whenever active route changes
  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const res = await api.get(`/ai/suggested-prompts?currentPage=${encodeURIComponent(location.pathname)}`);
        setSuggestedPrompts(res.data.prompts || []);
      } catch (err) {
        setSuggestedPrompts([
          "What features are available in this app?",
          "How do I use the live QR attendance system?",
          "How do I add a new student?",
          "What does the ML risk score mean?"
        ]);
      }
    };
    if (user) fetchPrompts();
  }, [location.pathname, user]);

  // Initialize Web Speech API for voice input
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error('Voice recognition is not supported in your browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success('Listening... Speak now.');
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  const speakText = (text: string) => {
    if (!isSpeaking || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#`_\-]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 300));
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: textToSend.trim(),
        currentPage: location.pathname,
        userRole: user?.role,
        history: messages.map(m => ({ role: m.role, parts: [m.content] }))
      });

      const replyText = res.data.reply || 'I am processing your query.';

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
      speakText(replyText);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: err.response?.data?.error || 'Failed to process request. Please verify connection and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied response to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (id: string, feedback: 'helpful' | 'unhelpful') => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, feedback } : m));
    toast.success(feedback === 'helpful' ? 'Thank you for your feedback!' : 'Feedback noted. We are improving responses.');
  };

  const handleClearHistory = async () => {
    try {
      await api.delete('/ai/chat-history');
      setMessages([
        {
          id: 'welcome-reset',
          role: 'model',
          content: 'Chat history cleared. How can I assist you with EduManager?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      toast.success('Chat history cleared');
    } catch (err) {
      toast.error('Failed to clear history');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none">
      
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-full shadow-2xl hover:scale-105 transition-all cursor-pointer border border-slate-700/60"
          aria-label="Open AI Assistant"
        >
          <div className="relative p-1.5 bg-[#f97316] rounded-full text-white shadow-glow">
            <Bot size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f97316]"></span>
            </span>
          </div>
          <span className="font-title font-extrabold text-xs tracking-wide">AI Assistant</span>
        </button>
      )}

      {/* Floating Drawer / Modal Panel */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[420px] h-[580px] bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
          
          {/* Drawer Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#f97316] rounded-xl text-white shadow-glow">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="font-title font-extrabold text-xs flex items-center gap-1.5">
                  EduManager Assistant
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 font-mono">Live Context</span>
                </h3>
                <p className="text-[10px] text-slate-300 font-medium">Page: <span className="font-mono text-[#f97316]">{location.pathname}</span> | Role: {user?.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  window.speechSynthesis?.cancel();
                  setIsSpeaking(!isSpeaking);
                }}
                title={isSpeaking ? "Mute Speech Audio" : "Unmute Speech Audio"}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700/60 transition-colors cursor-pointer"
              >
                {isSpeaking ? <Volume2 size={16} className="text-[#f97316]" /> : <VolumeX size={16} />}
              </button>

              <button
                onClick={handleClearHistory}
                title="Clear Chat History"
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700/60 transition-colors cursor-pointer"
              >
                <Trash2 size={16} />
              </button>

              <button
                onClick={() => {
                  window.speechSynthesis?.cancel();
                  setIsOpen(false);
                }}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700/60 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Page-Aware Suggested Question Pills */}
          {suggestedPrompts.length > 0 && (
            <div className="p-2.5 bg-slate-50 border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 self-center mr-1">
                <Sparkles size={12} className="text-[#f97316]" /> Suggested:
              </span>
              {suggestedPrompts.slice(0, 3).map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:border-[#f97316] text-slate-700 hover:text-[#f97316] rounded-full text-[10px] font-semibold transition-all cursor-pointer shrink-0 shadow-2xs"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 ${msg.role === 'user' ? 'bg-slate-800' : 'bg-[#f97316]'}`}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>

                <div className={`max-w-[82%] space-y-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3.5 rounded-2xl text-xs shadow-2xs ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={customMarkdownComponents}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  <div className="flex items-center justify-between px-1 text-[9px] font-mono text-slate-400">
                    <span>{msg.timestamp}</span>

                    {msg.role === 'model' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          title="Copy Answer"
                          className="p-1 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                          {copiedId === msg.id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, 'helpful')}
                          title="Helpful"
                          className={`p-1 hover:text-emerald-600 transition-colors cursor-pointer ${msg.feedback === 'helpful' ? 'text-emerald-600 font-bold' : ''}`}
                        >
                          <ThumbsUp size={11} />
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, 'unhelpful')}
                          title="Unhelpful"
                          className={`p-1 hover:text-red-600 transition-colors cursor-pointer ${msg.feedback === 'unhelpful' ? 'text-red-600 font-bold' : ''}`}
                        >
                          <ThumbsDown size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#f97316] text-white flex items-center justify-center">
                  <Bot size={14} className="animate-spin" />
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-500 font-medium animate-pulse flex items-center gap-2">
                  <RefreshCw size={12} className="animate-spin text-[#f97316]" />
                  <span>Searching verified knowledge base & live records...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-2">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${isListening ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                title="Voice Input"
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value.slice(0, 500))}
                placeholder={`Ask about ${location.pathname} or app features...`}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#f97316]"
              />

              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="p-2.5 bg-[#f97316] hover:bg-orange-600 text-white rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send size={16} />
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
