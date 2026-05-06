import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Calculator, 
  CalendarDays, 
  Users, 
  MapPin, 
  ChevronRight, 
  AlertCircle,
  Download,
  Layers,
  Palette,
  Clock,
  LayoutGrid,
  Timer,
  ArrowRight,
  FileText,
  Search,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  type?: 'text' | 'plan' | 'conflict';
  payload?: any;
}

type TabType = 'itinerary' | 'cost' | 'venues' | 'teams';

// --- Mock Data ---
const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'assistant',
  content: '您好！我是 798 艺术区计调助手。主色调已升级为“艺术红”，设计更清新。我可以帮您快速整理需求、核算报价。请告诉我您的团队计划？',
};

const SUGGESTED_INPUTS = [
  "10月15日，200人初二研学团，半日游，预算120元/人",
  "生成分团错峰行程与详细报价",
  "人数增加到250人，重新生成排期"
];

const ITINERARY_DATA = [
  { 
    time: '09:00', 
    task: 'UCCA尤伦斯当代艺术中心', 
    group: 'A组', 
    color: 'bg-red-500',
    image: 'https://images.unsplash.com/photo-1554941068-a252680d25d9?auto=format&fit=crop&q=80&w=400',
    desc: '核心场馆参观，包含当代艺术大展'
  },
  { 
    time: '09:00', 
    task: '涂鸦区写生', 
    group: 'B组', 
    color: 'bg-rose-400',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=400',
    desc: '户外开放区域色彩写生'
  },
  { 
    time: '10:30', 
    task: '陶瓷手工体验', 
    group: 'A组', 
    color: 'bg-rose-400',
    image: 'https://images.unsplash.com/photo-1520406853248-18fc0c75628a?auto=format&fit=crop&q=80&w=400',
    desc: '陶艺拉胚DIY'
  },
  { 
    time: '10:30', 
    task: 'UCCA错峰参观', 
    group: 'B组', 
    color: 'bg-red-500',
    image: 'https://images.unsplash.com/photo-1554941068-a252680d25d9?auto=format&fit=crop&q=80&w=400',
    desc: '错峰进入核心馆区'
  },
  { 
    time: '12:00', 
    task: '包豪斯餐厅', 
    group: '全员', 
    color: 'bg-slate-800',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=400',
    desc: '工业遗风研学桌餐'
  },
];

const VENUE_SCHEDULE = [
  { venue: 'UCCA A馆', slots: [{ start: 0, duration: 1.5, group: '八中 A组', color: 'bg-red-500' }, { start: 1.5, duration: 1.5, group: '八中 B组', color: 'bg-red-400' }] },
  { venue: '陶瓷研习社', slots: [{ start: 0, duration: 1.5, group: '八中 B组', color: 'bg-rose-400' }, { start: 1.5, duration: 1.5, group: '八中 A组', color: 'bg-rose-300' }] },
  { venue: '包豪斯餐厅', slots: [{ start: 2.5, duration: 1.5, group: '西门子团', color: 'bg-slate-800' }, { start: 4, duration: 1.5, group: '八中 全员', color: 'bg-red-600' }] },
  { venue: '798 剧场', slots: [{ start: 5, duration: 2, group: '美院团', color: 'bg-indigo-500' }] },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('itinerary');
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, activeTab]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: text, 
          user: 'agent_user_798',
          conversation_id: conversationId,
          inputs: {
            current_tab: activeTab,
            system_role: "798艺术区资深计调"
          }
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Dify Proxy Error data:", errData);
        // Prioritize details from the proxy catch block if available
        let errorMsg = errData.details || errData.message || errData.error || errData.code || `HTTP ${response.status}`;
        if (typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg);
        throw new Error(String(errorMsg));
      }

      const data = await response.json();
      
      // Save conversation ID for context
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }
      
      // Determine if it's a conflict or plan based on content
      let type: 'text' | 'plan' | 'conflict' = 'text';
      let payload = null;

      if (data.answer.includes('冲突') || data.answer.includes('无法容纳') || data.answer.includes('爆满')) {
        type = 'conflict';
        payload = {
            conflictDoc: '核心场馆',
            limit: 100,
            requested: 200,
            suggestion: '建议立即启动分团错峰调度。'
        };
      } else if (data.answer.includes('方案') || data.answer.includes('行程') || data.answer.includes('报价')) {
        type = 'plan';
        payload = {
            title: '798计调最优调度方案',
            date: '2025-10-15',
            pricing: [
              { item: '场馆通票', price: 40, count: 200, total: 8000 },
              { item: '实操工坊', price: 60, count: 200, total: 12000 },
              { item: '导师服务', price: 20, count: 200, total: 4000 },
            ],
            totalAmount: 24000,
            perPerson: 120
        };
        setShowCalendar(true);
      }

      const aiMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.answer,
        type,
        payload
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: `Error: ${error.message}. 请确认 Dify 服务运行状态。` 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- Views ---

  const renderItineraryView = () => (
    <div className={`flex-1 flex flex-col relative transition-all duration-500 ${showCalendar ? 'md:mr-[400px]' : ''}`}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-32 no-scrollbar">
            {messages.map((msg) => (
                <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        msg.role === 'assistant' 
                        ? 'bg-gradient-to-br from-red-600 to-rose-600 text-white shadow-xl shadow-red-100' 
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                        {msg.role === 'assistant' ? <Bot size={24} /> : <User size={24} />}
                    </div>
                    
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start flex flex-col'}`}>
                        <div className={`p-5 rounded-[32px] ${
                        msg.role === 'user' 
                        ? 'bg-red-600 text-white rounded-tr-none' 
                        : 'bg-rose-50/50 border border-rose-100 text-slate-700 rounded-tl-none shadow-sm'
                        }`}>
                        <p className="text-[15px] leading-relaxed font-medium">{msg.content}</p>
                        </div>

                        {msg.type === 'conflict' && (
                            <div className="mt-4 bg-white border-2 border-red-100 rounded-3xl p-6 shadow-xl shadow-red-50 flex gap-4">
                                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 shrink-0">
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-red-900 mb-1">容量调度冲突</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed mb-3">目标：{msg.payload.conflictDoc} · 请求 {msg.payload.requested} 人 · 阈值 {msg.payload.limit} 人</p>
                                    <div className="inline-flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full uppercase tracking-wider">
                                       建议方案：分团错峰并行
                                    </div>
                                </div>
                            </div>
                        )}

                        {msg.type === 'plan' && (
                            <div className="mt-6 bg-white border border-slate-100 rounded-[40px] overflow-hidden shadow-2xl shadow-rose-100/50 w-full max-w-xl">
                                <div className="bg-gradient-to-r from-red-600 to-rose-600 p-8 text-white relative overflow-hidden">
                                    <div className="relative z-10">
                                        <h3 className="text-2xl font-black mb-2">{msg.payload.title}</h3>
                                        <div className="flex gap-4 opacity-90 text-sm">
                                            <span className="flex items-center gap-1.5 font-bold"><CalendarDays size={14}/> {msg.payload.date}</span>
                                            <span className="flex items-center gap-1.5 font-bold"><Users size={14}/> 200 PAX</span>
                                        </div>
                                    </div>
                                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                                </div>
                                
                                <div className="p-8 space-y-6">
                                    <div className="space-y-3">
                                        <p className="text-xs font-black text-rose-300 uppercase tracking-widest">成本核算明细</p>
                                        {msg.payload.pricing.map((p: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-sm py-2 border-b border-slate-50">
                                                <span className="text-slate-600 font-bold">{p.item}</span>
                                                <span className="font-mono text-slate-400">¥{p.price} × {p.count}</span>
                                                <span className="font-bold text-slate-900">¥{p.total}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-rose-50 rounded-3xl p-6 flex justify-between items-center">
                                        <div>
                                            <p className="text-xs text-red-400 font-bold mb-1 uppercase tracking-widest">总核算金额</p>
                                            <p className="text-3xl font-black text-red-950">¥{msg.payload.totalAmount}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-red-400 font-bold mb-1 uppercase tracking-widest">人均成本</p>
                                            <p className="text-xl font-black text-red-600">¥{msg.payload.perPerson}</p>
                                        </div>
                                    </div>

                                    <button className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-red-100 flex items-center justify-center gap-2">
                                        确认确认并锁定分团排期 <ArrowRight size={20} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            ))}
            {isTyping && (
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center animate-pulse">
                        <Bot size={24} />
                    </div>
                </div>
            )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-white via-white to-transparent">
            <div className="max-w-4xl mx-auto">
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
                    {SUGGESTED_INPUTS.map((s, i) => (
                        <button key={i} onClick={() => handleSend(s)} className="whitespace-nowrap px-4 py-2 bg-white border border-rose-100 hover:border-red-300 hover:text-red-600 rounded-full text-xs font-bold text-slate-400 transition-all shadow-sm">
                            {s}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <input 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
                        placeholder="输入团期细节，例如：修改人数、降低预算..."
                        className="w-full bg-white border-2 border-rose-50 focus:border-red-500 rounded-3xl py-5 pl-8 pr-20 text-slate-700 shadow-2xl shadow-rose-100 outline-none transition-all placeholder:text-slate-300 font-bold"
                    />
                    <button onClick={() => handleSend(inputValue)} className="absolute right-4 top-4 w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-200 hover:scale-105 transition-transform">
                        <Send size={24} />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );

  const renderCostView = () => (
    <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">成本核算中心</h2>
          <p className="text-slate-400 font-bold">查看当前所有活跃行程的财务核对情况</p>
        </div>
        <button className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-red-100">
          <Plus size={20} /> 手动核销
        </button>
      </header>

      <div className="grid grid-cols-3 gap-8">
        {[
          { label: '预计总成本', value: '¥12.4w', icon: Calculator, color: 'text-red-600 bg-red-50' },
          { label: '已锁定报价单', value: '18 份', icon: FileText, color: 'text-indigo-600 bg-indigo-50' },
          { label: '待处理收支', value: '¥3,200', icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-rose-50 p-6 rounded-[32px] shadow-sm">
            <div className={`w-12 h-12 ${card.color} rounded-2xl flex items-center justify-center mb-4`}>
              <card.icon size={24} />
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{card.label}</p>
            <p className="text-2xl font-black text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-rose-50 rounded-[40px] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-rose-50 flex justify-between items-center bg-rose-50/20">
          <h3 className="font-black text-red-900">实时核算明细 (2025年10月)</h3>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50/50 text-[10px] font-black text-rose-300 uppercase tracking-widest border-b border-rose-50">
            <tr>
              <th className="px-8 py-4 text-left">团单信息</th>
              <th className="px-8 py-4 text-left">核算状态</th>
              <th className="px-8 py-4 text-right">人数</th>
              <th className="px-8 py-4 text-right">利润预期</th>
              <th className="px-8 py-4 text-right">总报价</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rose-50">
            {[
              { title: '北京八中研学', date: '10-15', status: '已锁定', pax: 200, margin: '22%', total: '¥24,000' },
              { title: '西门子商务访学', date: '10-18', status: '待核算', pax: 45, margin: '35%', total: '¥38,500' },
              { title: '美院联考团', date: '10-22', status: '已预订', pax: 120, margin: '18%', total: '¥14,400' },
            ].map((row, i) => (
              <tr key={i} className="hover:bg-rose-50/10 transition-colors">
                <td className="px-8 py-5">
                  <p className="font-bold text-slate-800">{row.title}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{row.date}</p>
                </td>
                <td className="px-8 py-5">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${row.status === '待核算' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-8 py-5 text-right font-mono text-slate-500 font-bold">{row.pax}</td>
                <td className="px-8 py-5 text-right font-bold text-green-500">{row.margin}</td>
                <td className="px-8 py-5 text-right font-black text-slate-900">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderVenuesView = () => (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 md:space-y-10 no-scrollbar pb-24 md:pb-10">
      <header>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">场馆容量监控</h2>
        <p className="text-slate-400 text-sm font-bold">基于 798 内部 RAG 知识库的实时库存状态</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {[
          { name: 'UCCA A馆', load: 100, status: '满载', color: 'bg-red-600' },
          { name: '陶瓷研习社', load: 45, status: '低负载', color: 'bg-green-500' },
          { name: '包豪斯餐厅', load: 85, status: '高负载', color: 'bg-amber-500' },
          { name: '涂鸦艺术区', load: 30, status: '空闲', color: 'bg-indigo-500' },
          { name: '798剧场', load: 60, status: '适中', color: 'bg-indigo-500' },
          { name: '木木美术馆', load: 95, status: '预警', color: 'bg-red-500' },
        ].map((v, i) => (
          <div key={i} className="bg-white border border-rose-50 p-6 rounded-[32px] shadow-sm relative overflow-hidden group hover:border-red-200 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="max-w-[70%]">
                <h4 className="font-black text-slate-800 truncate">{v.name}</h4>
                <p className="text-[10px] text-rose-300 font-black uppercase tracking-widest">{v.status}</p>
              </div>
              <div className={`w-8 h-8 rounded-xl ${v.color} text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-100`}>
                <MapPin size={16} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-black">
                <span className="text-slate-400 uppercase tracking-widest">实时占位</span>
                <span className="text-slate-900">{v.load}%</span>
              </div>
              <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                <div 
                    className={`h-full ${v.color} transition-all duration-1000`} 
                    style={{ width: `${v.load}%` }} 
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gantt-style Schedule */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                    <Timer size={22} />
                </div>
                <div>
                    <h3 className="font-black text-xl text-slate-900">场馆时段排期 (甘特图)</h3>
                    <p className="text-xs text-slate-400 font-bold">2025年10月15日 · 全场馆预约概览</p>
                </div>
            </div>
            <div className="flex gap-4 bg-white p-2 rounded-2xl border border-rose-50 shadow-sm overflow-x-auto no-scrollbar">
                {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'].map(t => (
                    <span key={t} className="text-[10px] font-black text-slate-400 px-2">{t}</span>
                ))}
            </div>
        </div>

        <div className="bg-white border border-rose-50 rounded-[40px] shadow-sm p-6 md:p-8 overflow-x-auto no-scrollbar">
            <div className="min-w-[800px] space-y-4">
                {/* Timeline Header */}
                <div className="flex items-center mb-6 pl-32">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex-1 text-center text-[10px] font-black text-rose-200 uppercase tracking-[0.2em] relative">
                            {9 + i}:00
                            <div className="absolute left-1/2 top-4 w-[1px] h-[300px] bg-rose-50 -translate-x-1/2 pointer-events-none" />
                        </div>
                    ))}
                </div>

                {/* Rows */}
                {VENUE_SCHEDULE.map((row, i) => (
                    <div key={i} className="flex items-center group">
                        <div className="w-32 font-black text-sm text-slate-700 pr-4 truncate group-hover:text-red-600 transition-colors">
                            {row.venue}
                        </div>
                        <div className="flex-1 h-12 bg-slate-50/50 rounded-2xl relative overflow-hidden border border-slate-50">
                            {row.slots.map((slot, j) => (
                                <motion.div 
                                    key={j}
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: `${(slot.duration / 8) * 100}%`, opacity: 1 }}
                                    style={{ 
                                        left: `${(slot.start / 8) * 100}%`,
                                    }}
                                    className={`absolute top-1 bottom-1 ${slot.color} rounded-xl shadow-lg shadow-black/5 flex items-center justify-center p-2 group/slot overflow-hidden border-2 border-white/20`}
                                >
                                    <span className="text-[9px] font-black text-white truncate px-1">
                                        {slot.group}
                                    </span>
                                    {/* Tooltip */}
                                    <div className="absolute opacity-0 group-hover/slot:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-bold py-1 px-2 rounded-lg -top-8 whitespace-nowrap shadow-xl pointer-events-none z-20">
                                        时段: {9 + slot.start}:00 - {9 + slot.start + slot.duration}:00
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-8 flex items-center gap-6 justify-center">
                {[
                    { label: '北京八中', color: 'bg-red-500' },
                    { label: '西门子团', color: 'bg-slate-800' },
                    { label: '中央美院', color: 'bg-indigo-500' }
                ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
      </section>
    </div>
  );

  const renderTeamsView = () => (
    <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">团队档案库</h2>
          <p className="text-slate-400 font-bold">管理历史带团偏好与客户档案</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input placeholder="搜索团队或负责人..." className="bg-rose-50/50 border border-rose-100 rounded-2xl py-3 pl-12 pr-6 text-sm font-bold outline-none focus:border-red-500 transition-all min-w-[300px]" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-8">
        {[
          { name: '北京师范大学附属中学', type: '学校客户', tag: '研学', desc: '注重教育背景，偏好手工体验课', groups: 42, revenue: '¥36.2w' },
          { name: '中青旅研学事业部', type: '旅行社', tag: '商务', desc: '价格敏感度高，需要精细成本表', groups: 128, revenue: '¥124w' },
        ].map((t, i) => (
          <div key={i} className="bg-white border border-rose-50 p-8 rounded-[40px] shadow-sm flex gap-6 hover:shadow-xl hover:shadow-rose-100/30 transition-all cursor-pointer group">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 shrink-0 group-hover:bg-red-600 group-hover:text-white transition-all">
              <Users size={40} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="font-black text-xl text-slate-900">{t.name}</h4>
                <span className="text-[10px] px-2 py-0.5 bg-slate-900 text-white rounded font-bold uppercase tracking-widest">{t.tag}</span>
              </div>
              <p className="text-xs font-bold text-slate-400 mb-4">{t.type} · {t.desc}</p>
              <div className="flex gap-10">
                <div>
                  <p className="text-[10px] font-black text-rose-300 uppercase mb-1">累计带团</p>
                  <p className="font-black text-slate-800">{t.groups} 个</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-rose-300 uppercase mb-1">贡献利润</p>
                  <p className="font-black text-slate-800">{t.revenue}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#FFF9F9] font-sans text-slate-900 overflow-hidden">
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden md:flex w-20 lg:w-72 bg-white border-r border-rose-100 flex-col z-20 shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-100 shrink-0">
            <LayoutGrid size={22} />
          </div>
          <div className="hidden lg:block">
            <h1 className="font-black text-lg tracking-tight text-red-900">798计调助手</h1>
            <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">Assistant 2.0</p>
          </div>
        </div>

        <nav className="flex-1 px-4 mt-8 space-y-2">
          <div className="hidden lg:block py-2 px-2 text-[11px] font-black text-rose-200 uppercase tracking-[0.2em] mb-2">核心工作台</div>
          {[
            { id: 'itinerary', icon: CalendarDays, label: '团期排期' },
            { id: 'cost', icon: Calculator, label: '成本核算' },
            { id: 'venues', icon: MapPin, label: '场馆地图' },
            { id: 'teams', icon: Users, label: '团队档案' },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id as TabType)}
              className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all duration-300 ${activeTab === item.id ? 'bg-red-600 text-white shadow-xl shadow-red-100 scale-105' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'}`}
            >
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className="hidden lg:block font-black text-sm tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto">
            <div className="hidden lg:flex items-center gap-3 p-4 bg-slate-50 rounded-3xl border border-rose-50">
                <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white overflow-hidden shadow-sm">
                    <img src="https://ui-avatars.com/api/?name=Agent&background=ff0000&color=fff" alt="Avatar" />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-black text-slate-800">计调专家 01</p>
                    <p className="text-[10px] text-rose-400 font-bold">在线中</p>
                </div>
            </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation (Visible only on small screens) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-rose-100 flex items-center justify-around z-30 px-2 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
          {[
            { id: 'itinerary', icon: CalendarDays, label: '排期' },
            { id: 'cost', icon: Calculator, label: '核算' },
            { id: 'venues', icon: MapPin, label: '场馆' },
            { id: 'teams', icon: Users, label: '团队' },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id as TabType)}
              className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === item.id ? 'text-red-600 scale-110' : 'text-slate-300'}`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          ))}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative bg-white border-l border-rose-50 h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 md:h-20 bg-white/80 backdrop-blur-xl border-b border-rose-50 flex items-center justify-between px-4 md:px-8 z-10 shrink-0">
          <div className="max-w-[150px] md:max-w-none truncate">
            <h2 className="text-[10px] md:text-sm font-bold text-slate-400 flex items-center gap-1 md:gap-2">
                {activeTab === 'itinerary' ? '团期排期' : activeTab === 'cost' ? '成本核算' : activeTab === 'venues' ? '场馆地图' : '团队档案'}
                <ChevronRight size={12} className="hidden md:block" /> 
                <span className="text-slate-900 md:text-base font-black truncate hidden md:inline">北京八中研学团方案</span>
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4 font-mono">
            {activeTab === 'itinerary' && (
                <button 
                    onClick={() => setShowCalendar(!showCalendar)}
                    className={`flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-full font-black text-[11px] md:text-sm transition-all ${showCalendar ? 'bg-red-600 text-white shadow-xl shadow-red-200' : 'bg-red-50 text-red-600 border border-red-100'}`}
                >
                    <CalendarDays size={16} className="md:w-[18px] md:h-[18px]" /> {showCalendar ? '关闭面板' : '查看排期'}
                </button>
            )}
            <button className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                <Download size={16} className="md:w-5 md:h-5" />
            </button>
          </div>
        </header>

        {/* Tab Content Rendering */}
        <div className="flex-1 flex overflow-hidden w-full pb-16 md:pb-0">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 flex overflow-hidden"
                >
                    {activeTab === 'itinerary' && renderItineraryView()}
                    {activeTab === 'cost' && renderCostView()}
                    {activeTab === 'venues' && renderVenuesView()}
                    {activeTab === 'teams' && renderTeamsView()}
                </motion.div>
            </AnimatePresence>

            {/* Smart Itinerary Panel - Only for Itinerary Tab */}
            <AnimatePresence>
                {activeTab === 'itinerary' && showCalendar && (
                    <motion.div 
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 md:top-20 bottom-0 w-full md:w-[400px] bg-[#FFFBFB] backdrop-blur-3xl border-l border-rose-100 p-6 md:p-8 overflow-y-auto no-scrollbar z-[40] md:z-10 shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-8 md:mb-10 pt-4 md:pt-0">
                            <h3 className="text-xl font-black text-red-900 tracking-tight">智能排期分析</h3>
                            <button onClick={() => setShowCalendar(false)} className="w-12 h-12 rounded-full bg-red-50 md:hover:bg-red-50 flex items-center justify-center text-red-400 md:text-rose-300 hover:text-red-600 transition-all">
                                <AlertCircle size={24} className="rotate-45" />
                            </button>
                        </div>

                        {/* Calendar Mini View */}
                        <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-8 shadow-xl shadow-rose-100/50 border border-white mb-8 md:mb-10">
                            <div className="flex justify-between items-center mb-6 md:mb-8 px-2">
                                <span className="font-black text-slate-800 text-lg">10月 2025</span>
                            </div>
                            <div className="grid grid-cols-7 gap-1 md:gap-2 text-center text-[10px] font-black text-rose-200 uppercase tracking-widest mb-4 md:mb-6">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d}>{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-2 md:gap-3">
                                {Array.from({ length: 31 }).map((_, i) => {
                                    const day = i + 1;
                                    const isTarget = day === 15;
                                    return (
                                        <div key={i} className={`h-8 md:h-10 flex items-center justify-center rounded-xl md:rounded-2xl text-xs md:text-sm font-black transition-all cursor-pointer ${isTarget ? 'bg-red-600 text-white shadow-xl shadow-red-200 scale-110' : 'text-slate-400 hover:bg-rose-50 hover:text-red-600'}`}>
                                            {day}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Itinerary Timeline */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6 bg-red-50/50 p-4 rounded-2xl">
                                <Timer size={20} className="text-red-500" />
                                <span className="text-xs font-black text-red-900 uppercase tracking-[0.2em]">错峰路线预览</span>
                            </div>
                            
                            <div className="space-y-8 relative ml-4">
                                <div className="absolute left-0 top-3 bottom-3 w-[2px] bg-gradient-to-b from-red-600 via-rose-300 to-slate-100" />
                                {ITINERARY_DATA.map((item, idx) => (
                                    <div key={idx} className="relative pl-10 group pb-4">
                                        <div className={`absolute left-[-6px] top-2 w-3.5 h-3.5 rounded-full border-[3px] border-white shadow-lg ${item.color} group-hover:scale-125 transition-transform z-10`} />
                                        <div className="bg-white rounded-[28px] overflow-hidden shadow-sm border border-rose-50 group-hover:border-red-200 group-hover:shadow-xl group-hover:shadow-rose-100/40 transition-all">
                                            {/* Image Section */}
                                            <div className="relative h-24 overflow-hidden">
                                                <img 
                                                    src={item.image} 
                                                    alt={item.task} 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${item.group === 'A组' ? 'bg-red-600 text-white' : item.group === 'B组' ? 'bg-rose-500 text-white' : 'bg-white text-slate-900'}`}>
                                                        {item.group}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="p-4">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-black text-rose-300 font-mono">{item.time}</span>
                                                    <ArrowRight size={12} className="text-rose-100 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
                                                </div>
                                                <p className="font-black text-slate-800 text-sm leading-tight mb-1">{item.task}</p>
                                                <p className="text-[10px] text-slate-400 font-medium truncate">{item.desc}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Map Visualization Section */}
                                <div className="mt-6 p-6 bg-red-50/30 rounded-[32px] border border-red-100 relative overflow-hidden">
                                    <div className="flex items-center gap-2 mb-4">
                                        <MapPin size={16} className="text-red-600" />
                                        <span className="text-[10px] font-black text-red-900 uppercase tracking-widest">动线地图示意</span>
                                    </div>
                                    <div className="relative h-48 bg-white/60 rounded-2xl border border-white p-4 flex items-center justify-center overflow-hidden">
                                        {/* Stylized Map View */}
                                        <div className="absolute inset-0 bg-[radial-gradient(#fee2e2_1px,transparent_1px)] [background-size:20px_20px] opacity-50" />
                                        
                                        {/* Group A Route */}
                                        <svg className="absolute inset-0 w-full h-full opacity-40">
                                            <path d="M40 40 Q 150 100 280 40" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="8 4" />
                                            <path d="M280 40 Q 200 120 180 160" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="8 4" />
                                        </svg>
                                        
                                        {/* Group B Route */}
                                        <svg className="absolute inset-0 w-full h-full opacity-40">
                                            <path d="M280 160 Q 150 100 40 160" fill="none" stroke="#fb7185" strokeWidth="3" strokeDasharray="8 4" />
                                            <path d="M40 160 Q 100 120 40 40" fill="none" stroke="#fb7185" strokeWidth="3" strokeDasharray="8 4" />
                                        </svg>

                                        {/* Landmarks */}
                                        <div className="relative z-10 flex flex-wrap gap-4 justify-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold">U</div>
                                                <span className="text-[8px] font-bold text-slate-500">UCCA</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="w-8 h-8 rounded-full bg-rose-400 border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold">W</div>
                                                <span className="text-[8px] font-bold text-slate-500">Workshop</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold">R</div>
                                                <span className="text-[8px] font-bold text-slate-500">Rest</span>
                                            </div>
                                        </div>
                                        
                                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-0.5 bg-red-600 border-dashed border-t-2" />
                                                <span className="text-[8px] font-black text-red-900">A组动线</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-0.5 bg-rose-400 border-dashed border-t-2" />
                                                <span className="text-[8px] font-black text-rose-500">B组动线</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
