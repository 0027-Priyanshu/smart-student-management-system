import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bot, Send, X, Sparkles, User, Volume2, VolumeX, Mic, MicOff, Copy, Check, ThumbsUp, ThumbsDown, Trash2, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../utils/api';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../../stores/toastStore';
import { customMarkdownComponents } from '../../utils/markdownComponents';

interface ProposedAction {
  actionType: 'mark_attendance' | 'send_parent_email' | 'navigate_analytics';
  title: string;
  description: string;
  payload: any;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  feedback?: 'helpful' | 'unhelpful';
  proposedAction?: ProposedAction;
  actionConfirmed?: boolean;
}

export default function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      content: 'Hello! I am your EduManager AI Assistant. I provide context-aware assistance, quick actions, and direct navigation to detailed academic intelligence. How can I help you today?',
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
          "Summarize today's academic activity",
          "Show urgent issues",
          "Which students need attention?",
          "Open detailed academic intelligence"
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
    const cleanText = text.replace(/[*#`_-]/g, '');
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
      
      // The backend AI tool calls decide whether to navigate or propose actions
      if (res.data.navigateTo) {
        navigate(res.data.navigateTo);
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposedAction: res.data.proposedAction
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

  const handleConfirmAction = async (msgId: string, action: ProposedAction) => {
    try {
      setLoading(true);
      const res = await api.post('/ai/actions/confirm', {
        actionType: action.actionType,
        payload: action.payload
      });

      toast.success(res.data.message || 'Action executed successfully!');
      
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionConfirmed: true } : m));

      if (res.data.targetUrl) {
        navigate(res.data.targetUrl);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to execute action.');
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

  // Draggable position & widget state
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('edumanager_ai_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return {
            x: Math.max(10, Math.min(window.innerWidth - 420, parsed.x)),
            y: Math.max(10, Math.min(window.innerHeight - 580, parsed.y))
          };
        }
      }
    } catch (e) {
      console.error(e);
    }
    return {
      x: Math.max(20, window.innerWidth - 430),
      y: Math.max(20, window.innerHeight - 590)
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragHasMoved, setDragHasMoved] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Save position to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('edumanager_ai_pos', JSON.stringify(position));
    } catch (e) {
      console.error(e);
    }
  }, [position]);

  // Recalculate & clamp position on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.max(10, Math.min(window.innerWidth - 420, prev.x)),
        y: Math.max(10, Math.min(window.innerHeight - 580, prev.y))
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignore drag if clicking inputs/buttons that are not the drag handle itself
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a') && !target.closest('.drag-handle')) return;
    setDragHasMoved(false);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a') && !target.closest('.drag-handle')) return;
    setDragHasMoved(false);
    setIsDragging(true);
    const touch = e.touches[0];
    setDragOffset({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    setDragHasMoved(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const isWidgetOpen = isOpen && !isMinimized;
    
    // Calculate actual pixel dimensions matching the CSS rules
    const actualWidth = isWidgetOpen ? (isExpanded ? Math.min(700, window.innerWidth * 0.94) : Math.min(400, window.innerWidth * 0.92)) : 180;
    const actualHeight = isWidgetOpen ? (isExpanded ? Math.min(750, window.innerHeight * 0.90) : Math.min(560, window.innerHeight * 0.85)) : 60;

    const newX = Math.max(5, Math.min(window.innerWidth - actualWidth - 5, clientX - dragOffset.x));
    const newY = Math.max(5, Math.min(window.innerHeight - actualHeight - 5, clientY - dragOffset.y));
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragOffset, isExpanded, isOpen, isMinimized]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove as any, { passive: false });
      window.addEventListener('touchmove', handleMouseMove as any, { passive: false });
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('touchmove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('touchmove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const resetPosition = () => {
    setPosition({
      x: Math.max(20, window.innerWidth - 430),
      y: Math.max(20, window.innerHeight - 590)
    });
    toast.success('AI Assistant position reset');
  };

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
      className="fixed z-40 select-none"
    >
      {/* Trigger Pill Button when Closed or Minimized */}
      {(!isOpen || isMinimized) && (
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={(e) => {
            if (dragHasMoved) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className={`drag-handle group flex items-center gap-2.5 px-4.5 py-3.5 bg-slate-900 text-white rounded-full shadow-2xl transition-all border border-slate-800 ${isDragging ? 'cursor-grabbing' : 'cursor-grab hover:scale-105'}`}
          style={{ touchAction: 'none' }}
          aria-label="Open AI Assistant"
        >
          <div className="relative p-1.5 bg-[#ff6b00] rounded-full text-white shadow-glow pointer-events-none">
            <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff6b00]"></span>
            </span>
          </div>
          <span className="font-title font-extrabold text-xs tracking-wide pointer-events-none">AI Assistant</span>
        </div>
      )}

      {/* Floating Movable Drawer Panel */}
      {isOpen && !isMinimized && (
        <div
          style={{
            width: isExpanded ? 'min(700px, 94vw)' : 'min(400px, 92vw)',
            height: isExpanded ? 'min(750px, 90vh)' : 'min(560px, 85vh)',
            touchAction: isDragging ? 'none' : 'auto'
          }}
          className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl shadow-card flex flex-col overflow-hidden animate-scaleUp transition-all duration-200"
        >
          {/* Drawer Drag Handle Header */}
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className={`drag-handle p-3 sm:p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{ touchAction: 'none' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#fff4ed] text-[#ff6b00] rounded-2xl border border-orange-200/50">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-title font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                  AI Assistant
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-50 text-emerald-600 font-extrabold border border-emerald-200">Online</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">Context: <span className="font-mono text-[#ff6b00]">{location.pathname}</span></p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  window.speechSynthesis?.cancel();
                  setIsSpeaking(!isSpeaking);
                }}
                title={isSpeaking ? "Mute Audio" : "Unmute Audio"}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {isSpeaking ? <Volume2 size={14} className="text-[#ff6b00]" /> : <VolumeX size={14} />}
              </button>

              <button
                onClick={handleClearHistory}
                title="Clear Chat History"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
              </button>

              <button
                onClick={resetPosition}
                title="Reset Position"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RefreshCw size={14} />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Restore Normal Size" : "Expand Full Window"}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Sparkles size={14} />
              </button>

              <button
                onClick={() => setIsMinimized(true)}
                title="Minimize AI Assistant"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Bot size={14} />
              </button>

              <button
                onClick={() => {
                  window.speechSynthesis?.cancel();
                  setIsOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Page-Aware Suggested Question Pills */}
          {suggestedPrompts.length > 0 && (
            <div className="p-2.5 bg-slate-50 border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 self-center mr-1">
                <Sparkles size={12} className="text-[#f97316]" /> Prompts:
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

                <div className={`max-w-[82%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3.5 rounded-2xl text-xs shadow-2xs ${msg.role === 'user' ? 'bg-orange-50 border border-orange-200 text-slate-900 rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={customMarkdownComponents}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* Contextual Action Confirmation Card */}
                  {msg.proposedAction && (
                    <div className="p-3 bg-orange-50/90 border border-orange-200 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-[#f97316]">
                        <AlertTriangle size={14} />
                        <span>{msg.proposedAction.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">{msg.proposedAction.description}</p>
                      
                      {msg.actionConfirmed ? (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 pt-1 border-t border-orange-200">
                          <CheckCircle2 size={14} />
                          <span>Action Confirmed & Executed!</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-1 border-t border-orange-200">
                          <button
                            onClick={() => handleConfirmAction(msg.id, msg.proposedAction!)}
                            className="px-3 py-1 bg-[#f97316] hover:bg-orange-600 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                          >
                            Confirm Action
                          </button>
                          <button
                            onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, proposedAction: undefined } : m))}
                            className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}

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
                  <span>Retrieving context & processing action...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Deep Link Button to Academic Intelligence */}
          <div className="px-3 py-1.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600 font-medium">
            <span>Need full analytics & trend charts?</span>
            <button
              onClick={() => {
                navigate('/academic-intelligence');
                setIsOpen(false);
              }}
              className="text-[#f97316] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Academic Intelligence Workspace</span>
              <ArrowRight size={12} />
            </button>
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
