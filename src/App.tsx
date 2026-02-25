import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  Activity, 
  Moon, 
  Utensils, 
  TrendingUp, 
  MessageSquare, 
  Award, 
  Zap,
  ChevronRight,
  Plus,
  Send,
  Loader2,
  LayoutDashboard,
  History,
  Settings,
  User as UserIcon
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, subDays } from 'date-fns';
import { getGeminiResponse, parseLogData } from './services/geminiService';
import { User, Log, ChatMessage } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'history'>('dashboard');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUserData();
    fetchLogs();
    fetchChatHistory();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const fetchUserData = async () => {
    const res = await fetch('/api/user');
    const data = await res.json();
    setUser(data);
  };

  const fetchLogs = async () => {
    const res = await fetch('/api/logs');
    const data = await res.json();
    setLogs(data);
  };

  const fetchChatHistory = async () => {
    const res = await fetch('/api/chat-history');
    const data = await res.json();
    if (data.length === 0) {
      setChatHistory([{ role: 'model', content: "Welcome to NeuroPulse. I'm your AI brain health coach. Log your first data point or ask me anything — let's build your optimal day. What's on your mind today?" }]);
    } else {
      setChatHistory(data);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to UI
    const newUserMessage: ChatMessage = { role: 'user', content: userMessage };
    setChatHistory(prev => [...prev, newUserMessage]);

    try {
      // 1. Save to DB history
      await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserMessage)
      });

      // 2. Parse for logs
      const logData = await parseLogData(userMessage);
      if (logData && logData.type) {
        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: logData.type, value: logData.data })
        });
        fetchLogs();
        fetchUserData();
      }

      // 3. Get AI response
      const aiResponse = await getGeminiResponse(userMessage, chatHistory);
      const newAiMessage: ChatMessage = { role: 'model', content: aiResponse };
      
      setChatHistory(prev => [...prev, newAiMessage]);
      await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAiMessage)
      });

    } catch (error) {
      console.error("Error in chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = logs
    .filter(l => l.type === 'mood' || l.type === 'sleep')
    .map(l => {
      const val = JSON.parse(l.value);
      return {
        date: format(new Date(l.logged_at), 'MM/dd'),
        value: l.type === 'mood' ? val.score : val.hours,
        type: l.type
      };
    })
    .reverse();

  return (
    <div className="flex h-screen bg-bg-dark overflow-hidden">
      {/* Sidebar */}
      <nav className="w-20 md:w-64 flex flex-col border-r border-white/10 bg-card-dark/50 backdrop-blur-md">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center neural-glow">
            <Brain className="text-white" size={24} />
          </div>
          <span className="hidden md:block font-serif text-xl font-bold tracking-tight">NeuroPulse</span>
        </div>

        <div className="flex-1 px-4 space-y-2 mt-4">
          <NavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
          />
          <NavButton 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')}
            icon={<MessageSquare size={20} />}
            label="AI Coach"
          />
          <NavButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
            icon={<History size={20} />}
            label="Logs"
          />
        </div>

        <div className="p-4 mt-auto border-t border-white/10">
          {user && (
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-brand-secondary/20 flex items-center justify-center text-brand-secondary">
                <UserIcon size={20} />
              </div>
              <div className="hidden md:block overflow-hidden">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-white/40 truncate">{user.email}</p>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-bottom border-white/10 flex items-center justify-between px-8 bg-bg-dark/80 backdrop-blur-md z-10">
          <h2 className="font-serif text-xl capitalize">{activeTab}</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Award className="text-yellow-500" size={18} />
              <span>{user?.neural_points || 0} Neural Points</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="text-orange-500" size={18} />
              <span>{user?.streak || 0} Day Streak</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 max-w-6xl mx-auto"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    title="BrainScore™" 
                    value="84" 
                    trend="+4%" 
                    icon={<Brain className="text-brand-primary" />}
                    color="brand-primary"
                  />
                  <StatCard 
                    title="Sleep Quality" 
                    value="7.2h" 
                    trend="-2%" 
                    icon={<Moon className="text-brand-secondary" />}
                    color="brand-secondary"
                  />
                  <StatCard 
                    title="Focus Level" 
                    value="High" 
                    trend="Stable" 
                    icon={<Activity className="text-emerald-400" />}
                    color="emerald-400"
                  />
                  <StatCard 
                    title="Daily Points" 
                    value="120" 
                    trend="+20" 
                    icon={<Award className="text-yellow-500" />}
                    color="yellow-500"
                  />
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 glass rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-xl font-serif font-bold">Cognitive Performance</h3>
                        <p className="text-sm text-white/40">Mood & Sleep trends over last 7 days</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-full bg-brand-primary" />
                          <span>Mood</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-full bg-brand-secondary" />
                          <span>Sleep</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData.length > 0 ? chartData : defaultChartData}>
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                          <XAxis dataKey="date" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#171717', border: '1px solid #ffffff10', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass rounded-3xl p-8 flex flex-col">
                    <h3 className="text-xl font-serif font-bold mb-6">Daily Challenges</h3>
                    <div className="space-y-4 flex-1">
                      <ChallengeItem 
                        title="Morning Sunlight" 
                        desc="10 mins exposure before 9 AM" 
                        points={50} 
                        completed={false}
                      />
                      <ChallengeItem 
                        title="Deep Work Block" 
                        desc="90 mins focused session" 
                        points={100} 
                        completed={true}
                      />
                      <ChallengeItem 
                        title="Magnesium Intake" 
                        desc="Log your evening nutrition" 
                        points={30} 
                        completed={false}
                      />
                    </div>
                    <button 
                      onClick={() => setActiveTab('chat')}
                      className="mt-6 w-full py-4 rounded-2xl bg-white text-black font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2"
                    >
                      Log Activity <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col max-w-4xl mx-auto w-full"
              >
                <div className="flex-1 overflow-y-auto space-y-6 pb-24 pr-4">
                  {chatHistory.map((msg, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex w-full",
                        msg.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[85%] rounded-3xl p-6 text-sm leading-relaxed",
                        msg.role === 'user' 
                          ? "bg-brand-primary text-white rounded-tr-none" 
                          : "glass text-white/90 rounded-tl-none markdown-body"
                      )}>
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="glass rounded-3xl p-6 rounded-tl-none">
                        <Loader2 className="animate-spin text-brand-primary" size={20} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="absolute bottom-8 left-8 right-8 max-w-4xl mx-auto">
                  <form 
                    onSubmit={handleSendMessage}
                    className="glass rounded-3xl p-2 flex items-center gap-2 shadow-2xl"
                  >
                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Log your day or ask a question..."
                      className="flex-1 bg-transparent border-none focus:ring-0 px-6 py-4 text-sm"
                    />
                    <button 
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-white hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
                    >
                      <Send size={20} />
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto w-full space-y-4"
              >
                <h3 className="text-2xl font-serif font-bold mb-8">Activity Logs</h3>
                {logs.length === 0 ? (
                  <div className="glass rounded-3xl p-12 text-center text-white/40">
                    <History size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No logs found. Start by chatting with your AI coach!</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="glass rounded-2xl p-6 flex items-center justify-between group hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          log.type === 'mood' ? "bg-pink-500/20 text-pink-500" :
                          log.type === 'sleep' ? "bg-brand-secondary/20 text-brand-secondary" :
                          log.type === 'activity' ? "bg-emerald-500/20 text-emerald-500" :
                          "bg-white/10 text-white"
                        )}>
                          {log.type === 'mood' && <Activity size={20} />}
                          {log.type === 'sleep' && <Moon size={20} />}
                          {log.type === 'activity' && <TrendingUp size={20} />}
                          {log.type === 'eating' && <Utensils size={20} />}
                          {log.type === 'brain_waves' && <Brain size={20} />}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{log.type}</p>
                          <p className="text-xs text-white/40">{format(new Date(log.logged_at), 'PPP p')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <pre className="text-xs font-mono text-white/60">{JSON.stringify(JSON.parse(log.value), null, 2)}</pre>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group",
        active ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white hover:bg-white/5"
      )}
    >
      <span className={cn("transition-transform", active ? "scale-110" : "group-hover:scale-110")}>{icon}</span>
      <span className="hidden md:block font-medium">{label}</span>
    </button>
  );
}

function StatCard({ title, value, trend, icon, color }: { title: string, value: string, trend: string, icon: React.ReactNode, color: string }) {
  const isPositive = trend.startsWith('+') || trend === 'Stable';
  return (
    <div className="glass rounded-3xl p-6 hover:scale-[1.02] transition-transform cursor-default">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <span className={cn(
          "text-xs font-bold px-2 py-1 rounded-full",
          isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
        )}>
          {trend}
        </span>
      </div>
      <p className="text-sm text-white/40 mb-1">{title}</p>
      <p className="text-2xl font-serif font-bold">{value}</p>
    </div>
  );
}

function ChallengeItem({ title, desc, points, completed }: { title: string, desc: string, points: number, completed: boolean }) {
  return (
    <div className={cn(
      "p-4 rounded-2xl border transition-all",
      completed ? "bg-brand-primary/10 border-brand-primary/20" : "bg-white/5 border-white/10"
    )}>
      <div className="flex items-center justify-between mb-1">
        <h4 className={cn("font-medium", completed && "text-brand-primary")}>{title}</h4>
        <div className="flex items-center gap-1 text-xs font-bold">
          <Award size={14} className={completed ? "text-brand-primary" : "text-white/40"} />
          <span className={completed ? "text-brand-primary" : "text-white/40"}>+{points}</span>
        </div>
      </div>
      <p className="text-xs text-white/40">{desc}</p>
    </div>
  );
}

const defaultChartData = [
  { date: '02/19', value: 7 },
  { date: '02/20', value: 8 },
  { date: '02/21', value: 6 },
  { date: '02/22', value: 9 },
  { date: '02/23', value: 8 },
  { date: '02/24', value: 7 },
  { date: '02/25', value: 8 },
];
