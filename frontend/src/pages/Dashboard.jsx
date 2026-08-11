import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { taskService, aiService, auditService } from '../services/api';
import UserSettingsModal from '../components/UserSettingsModal';
import {
  Plus, Search, ShieldCheck, ShieldAlert, LogOut, CheckCircle2,
  Clock, ClipboardList, Sparkles, Edit2, Trash2, Calendar,
  RefreshCw, Layers, Layout, Hourglass, Settings, AlertTriangle, Wallet, Bot, FileText, TrendingUp, X, Sun, Moon, Boxes, Workflow, Play, Pause, Eye
} from 'lucide-react';

// Preset AI Task Templates
const AI_TASK_TEMPLATES = [
  { title: 'Prepare client presentation & slide deck' },
  { title: 'Fix critical production auth bug' },
  { title: 'Database schema migration & index optimization' },
  { title: 'Conduct user feedback survey & report' },
  { title: 'Deploy new release to production pipeline' }
];

// ─── Tiny inline chart components ──────────────────────────────────────────

function DonutChart({ done, inProgress, todo, size = 120, isDarkMode }) {
  const total = done + inProgress + todo || 1;
  const r = 40;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const doneFrac = done / total;
  const ipFrac = inProgress / total;
  const todoFrac = todo / total;

  const doneLen = doneFrac * circumference;
  const ipLen = ipFrac * circumference;
  const todoLen = todoFrac * circumference;

  const doneOffset = 0;
  const ipOffset = doneLen;
  const todoOffset = doneLen + ipLen;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={isDarkMode ? '#334155' : '#f1f5f9'} strokeWidth="18" />
      {todoLen > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={isDarkMode ? '#64748b' : '#cbd5e1'} strokeWidth="18"
          strokeDasharray={`${todoLen} ${circumference - todoLen}`}
          strokeDashoffset={-todoOffset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
      {ipLen > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3b82f6" strokeWidth="18"
          strokeDasharray={`${ipLen} ${circumference - ipLen}`}
          strokeDashoffset={-ipOffset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
      {doneLen > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#10b981" strokeWidth="18"
          strokeDasharray={`${doneLen} ${circumference - doneLen}`}
          strokeDashoffset={-doneOffset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
      <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 18, fontWeight: 700, fill: isDarkMode ? '#f8fafc' : '#1e293b' }}>
        {Math.round((done / total) * 100)}%
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}>
        DONE
      </text>
    </svg>
  );
}

function BarChart({ highP, medP, lowP }) {
  const max = Math.max(highP, medP, lowP, 1);
  const barH = 70;
  const bars = [
    { label: 'HIGH', value: highP, color: '#ef4444' },
    { label: 'MED', value: medP, color: '#f59e0b' },
    { label: 'LOW', value: lowP, color: '#3b82f6' }
  ];

  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      {bars.map((bar, i) => {
        const x = 18 + i * 48;
        const h = bar.value === 0 ? 4 : Math.max(8, (bar.value / max) * barH);
        const y = 95 - h;
        return (
          <g key={bar.label}>
            <rect x={x} y={y} width={34} height={h} rx={5} fill={bar.color} opacity={0.85} />
            <text x={x + 17} y={95 + 12} textAnchor="middle" style={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }}>
              {bar.label}
            </text>
            <text x={x + 17} y={y - 4} textAnchor="middle" style={{ fontSize: 11, fill: bar.color, fontWeight: 700 }}>
              {bar.value}
            </text>
          </g>
        );
      })}
      <line x1="12" y1="95" x2="150" y2="95" stroke="#e2e8f0" strokeWidth="1.5" />
    </svg>
  );
}

function HoursBar({ completed, total, isDarkMode }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className={`flex justify-between text-[11px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
        <span>Hours Delivered</span>
        <span>{completed}h / {total}h</span>
      </div>
      <div className={`h-3 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[10px] text-slate-400 text-right">{pct}% of estimated effort completed</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('board');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Dark/Light Theme Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('themeMode') === 'dark');
  const [avatarColor, setAvatarColor] = useState(() => localStorage.getItem('userAvatarColor') || 'from-blue-600 to-indigo-600');

  useEffect(() => {
    localStorage.setItem('themeMode', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleAvatarUpdate = () => {
      setAvatarColor(localStorage.getItem('userAvatarColor') || 'from-blue-600 to-indigo-600');
    };
    window.addEventListener('avatarColorUpdated', handleAvatarUpdate);
    return () => window.removeEventListener('avatarColorUpdated', handleAvatarUpdate);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null);

  const [walletAddress, setWalletAddress] = useState('0x71C7656EC7ab88b098defB751B7401B5f6d893F9');
  const [walletStatus, setWalletStatus] = useState('Web3 Ledger Synced');

  // Derive dynamic Web3 address based on logged-in username
  useEffect(() => {
    if (user?.username) {
      let hash = 0;
      for (let i = 0; i < user.username.length; i++) {
        hash = (hash << 5) - hash + user.username.charCodeAt(i);
        hash |= 0;
      }
      const hex = Math.abs(hash).toString(16).padStart(8, '0');
      const dynamicAddr = `0x${hex}7656EC7ab88b098defB751B7401B${hex.substring(0, 4)}`;
      setWalletAddress(dynamicAddr);
    }
  }, [user]);

  const handleConnectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          setWalletAddress(accounts[0]);
          setWalletStatus('MetaMask Active');
        }
      } catch (e) {
        console.log('Wallet connect cancelled');
      }
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(walletAddress);
        setWalletStatus('Address Copied!');
        setTimeout(() => setWalletStatus('Web3 Ledger Synced'), 2000);
      }
    }
  };

  const [aiSummary, setAiSummary] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // Form states
  const [currentTask, setCurrentTask] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState('MEDIUM');
  const [formStatus, setFormStatus] = useState('TODO');
  const [formDueDate, setFormDueDate] = useState('');
  const [formEstimatedHours, setFormEstimatedHours] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [ledger, setLedger] = useState([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [expandedBlock, setExpandedBlock] = useState(null);

  const fetchTasks = async () => {
    try {
      const data = await taskService.getAllTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    }
  };

  const fetchLedger = async () => {
    setIsAuditLoading(true);
    try {
      const data = await auditService.getLedger();
      setLedger(data);
    } catch (err) {
      console.error('Failed to fetch audit log', err);
    } finally {
      setIsAuditLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsSummaryLoading(true);
    setIsSummaryModalOpen(true);
    try {
      const res = await aiService.getSummary();
      setAiSummary(res);
    } catch (err) {
      console.error('Failed to generate summary', err);
      const total = tasks.length;
      const done = tasks.filter(t => t.status === 'DONE').length;
      const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
      const todo = tasks.filter(t => t.status === 'TODO').length;
      const high = tasks.filter(t => t.priority === 'HIGH').length;
      const med = tasks.filter(t => t.priority === 'MEDIUM').length;
      const low = tasks.filter(t => t.priority === 'LOW').length;
      const rate = total > 0 ? Math.round((done / total) * 100) : 0;
      setAiSummary({
        summary: `You have ${total} total tasks. ${done} completed, ${inProgress} in progress, ${todo} pending.`,
        advice: high > 0 ? `Focus on your ${high} high-priority tasks first!` : 'Keep up the great pace!',
        total, done, inProgress, todo, highPriority: high, medPriority: med, lowPriority: low,
        overdue: 0, totalHours: 0, completedHours: 0, completionRate: rate
      });
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const handleVerifyLedger = async () => {
    setIsAuditLoading(true);
    try {
      const result = await auditService.verifyLedger();
      setAuditResult(result);
    } catch (err) {
      setAuditResult({ isValid: false, message: 'Could not connect to backend. Ensure server is running.', totalBlocks: 0 });
    } finally {
      setIsAuditLoading(false);
    }
  };

  const handleRepairLedger = async () => {
    setIsAuditLoading(true);
    try {
      const result = await auditService.repairLedger();
      setAuditResult(result);
      fetchLedger();
    } catch (err) {
      console.error('Failed to repair ledger', err);
    } finally {
      setIsAuditLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);
  useEffect(() => {
    if (activeTab === 'ledger') { fetchLedger(); setAuditResult(null); }
  }, [activeTab]);

  // Duplicate detection
  useEffect(() => {
    if (formTitle.trim() && !currentTask) {
      setDuplicateWarning(tasks.some(t => t.title.toLowerCase() === formTitle.trim().toLowerCase()));
    } else {
      setDuplicateWarning(false);
    }
  }, [formTitle, tasks, currentTask]);

  const getDefaultDueDate = () => {
    const d = new Date(); d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  };

  const handleOpenCreateModal = () => {
    setCurrentTask(null);
    setFormTitle(''); setFormDescription('');
    setFormPriority('MEDIUM'); setFormStatus('TODO');
    setFormDueDate(getDefaultDueDate()); setFormEstimatedHours('3');
    setDuplicateWarning(false); setIsModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setCurrentTask(task);
    setFormTitle(task.title); setFormDescription(task.description || '');
    setFormPriority(task.priority); setFormStatus(task.status);
    setFormDueDate(task.dueDate || getDefaultDueDate());
    setFormEstimatedHours(task.estimatedHours ? String(task.estimatedHours) : '3');
    setDuplicateWarning(false); setIsModalOpen(true);
  };

  const handleSelectTemplate = (templateTitle) => {
    setFormTitle(templateTitle);
    triggerAiFill(templateTitle);
  };

  const triggerAiFill = async (titleToUse) => {
    const title = titleToUse || formTitle;
    if (!title.trim()) { alert('Enter or select a task title first!'); return; }
    setIsAiLoading(true);
    try {
      const s = await aiService.getSuggestions(title);
      setFormDescription(s.description);
      setFormPriority(s.priority);
      setFormEstimatedHours(String(s.estimatedHours));
      if (!formDueDate) setFormDueDate(getDefaultDueDate());
    } catch (err) {
      console.error('AI suggestion failed', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm('Delete this task? Action will be logged in the audit ledger.')) {
      try {
        await taskService.deleteTask(id);
        fetchTasks();
        if (selectedTaskForDetail?.id === id) {
          setSelectedTaskForDetail(null);
        }
      } catch (err) {
        console.error('Failed to delete task', err);
      }
    }
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    const payload = {
      title: formTitle, description: formDescription,
      priority: formPriority, status: formStatus,
      dueDate: formDueDate || null,
      estimatedHours: formEstimatedHours ? parseInt(formEstimatedHours, 10) : null
    };
    try {
      if (currentTask) await taskService.updateTask(currentTask.id, payload);
      else await taskService.createTask(payload);
      setIsModalOpen(false); fetchTasks();
    } catch (err) { console.error('Failed to save task', err); }
  };

  const handleMoveStatus = async (task, newStatus) => {
    try {
      const updated = await taskService.updateTask(task.id, {
        title: task.title, description: task.description,
        priority: task.priority, status: newStatus,
        dueDate: task.dueDate, estimatedHours: task.estimatedHours
      });
      fetchTasks();
      if (selectedTaskForDetail?.id === task.id) {
        setSelectedTaskForDetail(updated);
      }
    } catch (err) { console.error('Failed to update status', err); }
  };

  const filteredTasks = tasks.filter(t => {
    const ms = t.title.toLowerCase().includes(search.toLowerCase()) ||
               (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    const mp = priorityFilter === 'ALL' || t.priority === priorityFilter;
    return ms && mp;
  });

  const todoTasks = filteredTasks.filter(t => t.status === 'TODO');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'IN_PROGRESS');
  const doneTasks = filteredTasks.filter(t => t.status === 'DONE');

  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(t => t.status !== 'DONE').length;
  const completedCount = tasks.filter(t => t.status === 'DONE').length;

  return (
    <div className={`min-h-screen flex transition-colors ${
      isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>

      {/* Sidebar */}
      <aside className={`w-64 border-r flex flex-col justify-between shrink-0 shadow-2xs transition-colors ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className={`h-16 flex items-center gap-2.5 px-6 border-b ${
            isDarkMode ? 'border-slate-800' : 'border-slate-100'
          }`}>
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl text-white shadow-md shadow-blue-500/20">
              <Boxes className="w-5 h-5" />
            </div>
            <span className={`font-bold text-lg tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              SyncTask <span className="text-blue-500 font-semibold">AI</span>
            </span>
          </div>

          <nav className="p-4 space-y-1">
            {[
              { id: 'board', icon: Layout, label: 'Task Workspace' },
              { id: 'ledger', icon: Layers, label: 'Blockchain Audit' }
            ].map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === id
                    ? isDarkMode
                      ? 'bg-blue-900/40 text-blue-300 border border-blue-800'
                      : 'bg-blue-50 text-blue-700 border border-blue-100 shadow-2xs'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className={`p-4 border-t space-y-3 ${
          isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50/50'
        }`}>
          <div 
            onClick={handleConnectWallet}
            className={`w-full py-2 px-3 border cursor-pointer rounded-xl text-[11px] font-bold flex items-center justify-between shadow-2xs transition-colors ${
              isDarkMode ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Click to copy address or connect MetaMask"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Wallet className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title={walletStatus}></span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
              <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${avatarColor} flex items-center justify-center font-bold text-white text-xs shadow-sm`}>
                {user?.username?.substring(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <h4 className={`font-bold truncate text-xs ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{user?.username}</h4>
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  {user?.roles?.[0]?.replace('ROLE_', '') || 'USER'}
                </span>
              </div>
            </div>
            <button onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50/20 rounded-lg transition-colors cursor-pointer">
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <button onClick={logout}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 border rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-red-950/40 hover:text-red-400 hover:border-red-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
            }`}>
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={`flex-1 flex flex-col min-w-0 transition-colors ${
        isDarkMode ? 'bg-slate-950' : 'bg-slate-50'
      }`}>

        <header className={`h-16 border-b px-8 flex items-center justify-between shadow-2xs z-10 transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              {activeTab === 'board' ? 'Task Workspace' : 'Cryptographic Audit Trail'}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}>Portal Active</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark / Light Mode Toggle Button */}
            <button 
              onClick={() => setIsDarkMode(prev => !prev)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button onClick={handleGenerateSummary}
              className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                isDarkMode ? 'bg-blue-900/40 border-blue-800 text-blue-300 hover:bg-blue-900/60' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}>
              <Bot className="w-4 h-4 text-blue-500" />
              AI Productivity Summary
            </button>

            {activeTab === 'board' && (
              <button onClick={handleOpenCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
                <Plus className="w-4 h-4" />
                New Task
              </button>
            )}

            <button onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDarkMode ? 'text-slate-300 border-slate-700 hover:bg-slate-800' : 'text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}>
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">

          {/* BOARD VIEW */}
          {activeTab === 'board' && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { label: 'Total Tasks', value: totalTasks, icon: ClipboardList, bg: isDarkMode ? 'bg-blue-950/60 text-blue-400 border-blue-900' : 'bg-blue-50 text-blue-600 border-blue-100' },
                  { label: 'Pending Tasks', value: pendingTasks, icon: Clock, bg: isDarkMode ? 'bg-amber-950/60 text-amber-400 border-amber-900' : 'bg-amber-50 text-amber-600 border-amber-100' },
                  { label: 'Completed', value: completedCount, icon: CheckCircle2, bg: isDarkMode ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900' : 'bg-emerald-50 text-emerald-600 border-emerald-100' }
                ].map(({ label, value, icon: Icon, bg }) => (
                  <div key={label} className={`rounded-2xl p-5 border shadow-2xs flex items-center gap-4 transition-colors ${
                    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className={`${bg} p-3 rounded-xl border`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">{label}</span>
                      <span className={`text-2xl font-bold mt-0.5 block ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl border shadow-2xs transition-colors ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search tasks by title or description..."
                    className={`w-full pl-10 pr-9 py-2 border rounded-xl text-xs font-medium focus:outline-none transition-colors ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
                    }`} />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none transition-colors cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Priority:</span>
                  {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map(p => (
                    <button key={p} onClick={() => setPriorityFilter(p)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        priorityFilter === p 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : isDarkMode
                          ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kanban */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {[
                  { label: 'To Do', status: 'TODO', items: todoTasks, dot: 'bg-slate-400', textColor: isDarkMode ? 'text-slate-400' : 'text-slate-600', badgeBg: isDarkMode ? 'bg-slate-800' : 'bg-slate-200', badgeText: isDarkMode ? 'text-slate-300' : 'text-slate-700' },
                  { label: 'In Progress', status: 'IN_PROGRESS', items: inProgressTasks, dot: 'bg-blue-600', textColor: 'text-blue-500', badgeBg: isDarkMode ? 'bg-blue-950/60' : 'bg-blue-100', badgeText: isDarkMode ? 'text-blue-300' : 'text-blue-700' },
                  { label: 'Done', status: 'DONE', items: doneTasks, dot: 'bg-emerald-600', textColor: 'text-emerald-500', badgeBg: isDarkMode ? 'bg-emerald-950/60' : 'bg-emerald-100', badgeText: isDarkMode ? 'text-emerald-300' : 'text-emerald-700' }
                ].map(col => (
                  <div key={col.status} className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`}></span>
                        <h3 className={`font-bold text-xs uppercase tracking-wider ${col.textColor}`}>{col.label}</h3>
                      </div>
                      <span className={`px-2 py-0.5 ${col.badgeBg} ${col.badgeText} text-xs font-bold rounded-md`}>
                        {col.items.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {col.items.map(task => (
                        <TaskCard key={task.id} task={task}
                          onEdit={handleOpenEditModal}
                          onDelete={handleDeleteTask}
                          onMoveStatus={handleMoveStatus}
                          onViewDetails={(t) => setSelectedTaskForDetail(t)}
                          isDarkMode={isDarkMode} />
                      ))}
                      {col.items.length === 0 && <EmptyState text={`No ${col.label.toLowerCase()} tasks`} isDarkMode={isDarkMode} />}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* LEDGER VIEW */}
          {activeTab === 'ledger' && (
            <div className="space-y-6">
              <div className={`rounded-2xl p-6 border shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div>
                  <h2 className={`text-base font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Cryptographic History Audit Trail</h2>
                  <p className="text-slate-500 text-xs mt-0.5">Immutable task history verification powered by SHA-256 block hash chaining.</p>
                </div>
                <button onClick={handleVerifyLedger} disabled={isAuditLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer">
                  {isAuditLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Verify Ledger Integrity
                </button>
              </div>

              {auditResult && (
                <div className={`border rounded-2xl p-4 flex items-start justify-between gap-3 shadow-2xs ${
                  auditResult.isValid 
                    ? isDarkMode ? 'bg-emerald-950/30 border-emerald-900 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : isDarkMode ? 'bg-red-950/30 border-red-900 text-red-200' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-start gap-3">
                    {auditResult.isValid ? <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /> : <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />}
                    <div>
                      <h4 className="font-bold text-xs">{auditResult.isValid ? 'Ledger Validated — Zero Tampering Detected' : 'Ledger Verification Warning'}</h4>
                      <p className="text-xs mt-0.5 opacity-90">{auditResult.message}</p>
                      <p className="text-[10px] mt-1 opacity-70 uppercase font-bold tracking-wider">Verified Blocks: {auditResult.totalBlocks}</p>
                    </div>
                  </div>

                  {!auditResult.isValid && (
                    <button onClick={handleRepairLedger} disabled={isAuditLoading}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer">
                      <RefreshCw className={`w-3.5 h-3.5 ${isAuditLoading ? 'animate-spin' : ''}`} />
                      Re-sync Hashes
                    </button>
                  )}
                </div>
              )}

              <div className="relative pl-8 space-y-4">
                {ledger.map((block, index) => {
                  const isExpanded = expandedBlock === block.id;
                  let parsedData = {};
                  try { parsedData = JSON.parse(block.data); } catch { parsedData = { raw: block.data }; }
                  const actionColor = block.action === 'CREATED' ? 'text-blue-400 bg-blue-950/50 border-blue-900'
                    : block.action === 'UPDATED' ? 'text-amber-400 bg-amber-950/50 border-amber-900'
                    : 'text-red-400 bg-red-950/50 border-red-900';
                  return (
                    <div key={block.id} className="relative">
                      <span className={`absolute -left-11 top-2.5 w-6 h-6 rounded-full flex items-center justify-center border font-bold text-[10px] ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-600'
                      }`}>
                        {index + 1}
                      </span>
                      <div className={`rounded-2xl p-5 border shadow-2xs transition-all ${
                        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase ${actionColor}`}>{block.action}</span>
                            <h4 className={`font-bold text-xs ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Task #{block.taskId}: <span className="font-normal text-slate-400">{parsedData.title}</span></h4>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>{new Date(block.timestamp).toLocaleString()}</span>
                            <button onClick={() => setExpandedBlock(isExpanded ? null : block.id)}
                              className="text-blue-500 hover:text-blue-400 font-bold flex items-center gap-1 focus:outline-none cursor-pointer">
                              <FileText className="w-3.5 h-3.5" />
                              {isExpanded ? 'Hide Details' : 'Inspect Block'}
                            </button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className={`mt-4 pt-4 border-t space-y-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                            {/* Structured State Details */}
                            <div className={`p-4 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs ${
                              isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/70 border-slate-200'
                            }`}>
                              <div>
                                <span className="text-slate-400 font-bold uppercase text-[9px] block">Task Title</span>
                                <span className={`font-bold truncate block ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{parsedData.title || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold uppercase text-[9px] block">Recorded Status</span>
                                <span className="font-semibold text-blue-500 block">{parsedData.status || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold uppercase text-[9px] block">Priority</span>
                                <span className={`font-semibold block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{parsedData.priority || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold uppercase text-[9px] block">Due Date</span>
                                <span className="font-medium text-slate-400 block">{parsedData.dueDate || 'N/A'}</span>
                              </div>
                            </div>

                            {/* Hashes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                              <div>
                                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px] mb-1">Previous SHA-256 Hash</span>
                                <code className={`block p-2.5 rounded-lg border break-all font-mono text-[11px] ${
                                  isDarkMode ? 'bg-slate-850 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}>{block.previousHash}</code>
                              </div>
                              <div>
                                <span className="text-blue-500 font-bold block uppercase tracking-wider text-[9px] mb-1">Block SHA-256 Hash</span>
                                <code className={`block p-2.5 rounded-lg border break-all font-mono text-[11px] ${
                                  isDarkMode ? 'bg-blue-950/40 border-blue-900 text-blue-300' : 'bg-blue-50/50 border-blue-100 text-blue-800'
                                }`}>{block.hash}</code>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Task Detail Modal with Live Timer */}
      {selectedTaskForDetail && (
        <TaskDetailModal
          task={selectedTaskForDetail}
          onClose={() => setSelectedTaskForDetail(null)}
          onMoveStatus={handleMoveStatus}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Task Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl border shadow-2xl p-6 max-h-[92vh] flex flex-col transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`flex justify-between items-center pb-3 border-b mb-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <h3 className="text-base font-bold">{currentTask ? 'Edit Task' : 'Create New Task'}</h3>
              <button onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 font-bold text-sm rounded-lg hover:bg-slate-800 cursor-pointer">✕</button>
            </div>

            {duplicateWarning && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                AI Alert: A task with this title already exists in your workspace.
              </div>
            )}

            <form onSubmit={handleSaveTask} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between text-slate-400">
                  <span>Quick AI Task Templates</span>
                  <span className="text-[10px] text-blue-500 font-semibold">Select to Auto-Fill</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AI_TASK_TEMPLATES.map(tmpl => (
                    <button key={tmpl.title} type="button" onClick={() => handleSelectTemplate(tmpl.title)}
                      className={`px-2.5 py-1 border rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-blue-900/40 hover:text-blue-300' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}>
                      + {tmpl.title}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-400">Task Title</label>
                <div className="relative">
                  <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)}
                    placeholder="Type a title or pick a template above..." required
                    className={`w-full pl-4 pr-24 py-2.5 border rounded-xl text-xs font-medium focus:outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
                    }`} />
                  <button type="button" onClick={() => triggerAiFill()} disabled={isAiLoading || !formTitle.trim()}
                    className="absolute right-2 top-1.5 px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer">
                    {isAiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    AI Fill
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-400">Description</label>
                <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)}
                  placeholder="AI generated description will appear here..." rows={4}
                  className={`w-full px-4 py-2.5 border rounded-xl text-xs font-medium whitespace-pre-line focus:outline-none ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
                  }`} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-400">Priority</label>
                  <select value={formPriority} onChange={e => setFormPriority(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
                    }`}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-400">Status</label>
                  <select value={formStatus} onChange={e => setFormStatus(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
                    }`}>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-400">Due Date</label>
                  <input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl text-xs font-medium focus:outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
                    }`} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-400">Effort (Hours)</label>
                  <input type="number" min="0" value={formEstimatedHours} onChange={e => setFormEstimatedHours(e.target.value)}
                    placeholder="e.g. 4"
                    className={`w-full px-3 py-2.5 border rounded-xl text-xs font-medium focus:outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
                    }`} />
                </div>
              </div>

              <div className={`flex items-center justify-end gap-3 pt-4 border-t mt-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
                  {currentTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Summary Modal */}
      {isSummaryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden max-h-[92vh] flex flex-col transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex items-center gap-2.5 text-white">
                <TrendingUp className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm">AI Productivity Dashboard</h3>
                  <p className="text-blue-200 text-[10px]">Real-time task analytics & AI insights</p>
                </div>
              </div>
              <button onClick={() => setIsSummaryModalOpen(false)} className="text-white/70 hover:text-white font-bold text-sm focus:outline-none cursor-pointer">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {isSummaryLoading ? (
                <div className="py-16 flex flex-col items-center gap-3">
                  <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
                  <span className="text-xs font-semibold text-slate-500">Generating AI Insights...</span>
                </div>
              ) : aiSummary && (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Total', value: aiSummary.total ?? 0, color: 'text-slate-800 dark:text-slate-100', bg: isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200' },
                      { label: 'Done', value: aiSummary.done ?? 0, color: 'text-emerald-500', bg: isDarkMode ? 'bg-emerald-950/40 border-emerald-900' : 'bg-emerald-50 border-emerald-200' },
                      { label: 'In Progress', value: aiSummary.inProgress ?? 0, color: 'text-blue-500', bg: isDarkMode ? 'bg-blue-950/40 border-blue-900' : 'bg-blue-50 border-blue-200' },
                      { label: 'Overdue', value: aiSummary.overdue ?? 0, color: 'text-red-500', bg: isDarkMode ? 'bg-red-950/40 border-red-900' : 'bg-red-50 border-red-200' }
                    ].map(k => (
                      <div key={k.label} className={`${k.bg} border rounded-xl p-3 text-center`}>
                        <span className={`block text-2xl font-bold ${k.color}`}>{k.value}</span>
                        <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">{k.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className={`border rounded-2xl p-4 shadow-2xs ${isDarkMode ? 'bg-slate-850 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <h5 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Task Status Breakdown</h5>
                      <div className="flex items-center gap-6">
                        <DonutChart done={Number(aiSummary.done ?? 0)} inProgress={Number(aiSummary.inProgress ?? 0)} todo={Number(aiSummary.todo ?? 0)} size={120} isDarkMode={isDarkMode} />
                        <div className="space-y-2 text-xs">
                          {[
                            { label: 'Done', value: aiSummary.done ?? 0, color: 'bg-emerald-500' },
                            { label: 'In Progress', value: aiSummary.inProgress ?? 0, color: 'bg-blue-500' },
                            { label: 'To Do', value: aiSummary.todo ?? 0, color: isDarkMode ? 'bg-slate-600' : 'bg-slate-300' }
                          ].map(l => (
                            <div key={l.label} className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${l.color} shrink-0`}></span>
                              <span className="text-slate-600 dark:text-slate-400 font-medium">{l.label}</span>
                              <span className={`font-bold ml-auto pl-3 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{l.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className={`border rounded-2xl p-4 shadow-2xs ${isDarkMode ? 'bg-slate-850 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <h5 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Priority Distribution</h5>
                      <div className="flex flex-col items-center gap-2">
                        <BarChart highP={Number(aiSummary.highPriority ?? 0)} medP={Number(aiSummary.medPriority ?? 0)} lowP={Number(aiSummary.lowPriority ?? 0)} />
                        <div className="flex items-center gap-4 text-[10px] font-bold">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500 inline-block"></span> High</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400 inline-block"></span> Medium</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500 inline-block"></span> Low</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`border rounded-2xl p-4 shadow-2xs space-y-3 ${isDarkMode ? 'bg-slate-850 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <h5 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overall Completion Rate</h5>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-500">{aiSummary.completionRate ?? 0}%</span>
                    </div>
                    <div className={`h-4 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700" style={{ width: `${aiSummary.completionRate ?? 0}%` }} />
                    </div>
                    <HoursBar completed={Number(aiSummary.completedHours ?? 0)} total={Number(aiSummary.totalHours ?? 0)} isDarkMode={isDarkMode} />
                  </div>
                </>
              )}
            </div>

            <div className={`px-6 py-3 border-t flex justify-end ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50'}`}>
              <button onClick={() => setIsSummaryModalOpen(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer">
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      <UserSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

// ── Task View Detail Modal with Persistent Live Timer ───────────────────────
function TaskDetailModal({ task, onClose, onMoveStatus, isDarkMode }) {
  const timerKey = `task_timer_${task.id}`;
  const [timerSeconds, setTimerSeconds] = useState(() => {
    const saved = localStorage.getItem(timerKey);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => {
          const nextSec = s + 1;
          localStorage.setItem(timerKey, String(nextSec));
          return nextSec;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerKey]);

  const formatTime = (secs) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartOrResumeTask = () => {
    setIsTimerRunning(true);
    if (task.status !== 'IN_PROGRESS') {
      onMoveStatus(task, 'IN_PROGRESS');
    }
  };

  const handlePauseTask = () => {
    setIsTimerRunning(false);
  };

  const handleCompleteTask = () => {
    setIsTimerRunning(false);
    onMoveStatus(task, 'DONE');
  };

  const isCompleted = task.status === 'DONE';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`w-full max-w-xl rounded-2xl border shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-5 transition-colors ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
      }`}>
        {/* Header */}
        <div className={`flex justify-between items-start pb-3 border-b ${
          isDarkMode ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                task.priority === 'HIGH' ? 'bg-red-100 text-red-700 border border-red-200' :
                task.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                'bg-blue-100 text-blue-700 border border-blue-200'
              }`}>
                {task.priority} Priority
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                'bg-slate-100 text-slate-800 border border-slate-200'
              }`}>
                {task.status.replace('_', ' ')}
              </span>
            </div>
            <h3 className={`text-xl font-extrabold tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {task.title}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className={`p-1.5 font-bold text-sm rounded-lg transition-colors cursor-pointer ${
              isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            ✕
          </button>
        </div>

        {/* Work Timer / Completion Display */}
        {isCompleted ? (
          /* Completed Task View - No Active Timer Controls */
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white font-bold shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">Task Completed</span>
                <span className="font-mono text-lg font-black tracking-tight">{formatTime(timerSeconds)} Logged</span>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-2xs">COMPLETED</span>
          </div>
        ) : (
          /* Active Work Timer Widget with Start / Resume / Pause */
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isDarkMode ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${isTimerRunning ? 'bg-emerald-500 text-white animate-pulse' : 'bg-blue-600 text-white'}`}>
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Active Work Timer</span>
                <span className={`font-mono text-2xl font-black tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  {formatTime(timerSeconds)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isTimerRunning ? (
                <button 
                  onClick={handleStartOrResumeTask} 
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-4 h-4" /> {timerSeconds > 0 ? 'Resume Task' : 'Start Task'}
                </button>
              ) : (
                <button 
                  onClick={handlePauseTask} 
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Pause className="w-4 h-4" /> Pause Timer
                </button>
              )}
              <button 
                onClick={handleCompleteTask} 
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark Complete
              </button>
            </div>
          </div>
        )}

        {/* Task Description & Action Plan */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Task Description & Action Plan</h4>
          <div className={`p-4 rounded-xl border text-xs leading-relaxed whitespace-pre-line font-medium ${
            isDarkMode ? 'bg-slate-800/40 border-slate-700/60 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}>
            {task.description || 'No detailed description provided.'}
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] block mb-0.5">Due Date</span>
            <span className={`font-extrabold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'None'}
            </span>
          </div>
          <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] block mb-0.5">Estimated Effort</span>
            <span className={`font-extrabold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {task.estimatedHours ? `${task.estimatedHours} Hours` : 'Flexible'}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 flex justify-end">
          <button 
            onClick={onClose} 
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
            }`}
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task Card Component ──────────────────────────────────────────────────
function TaskCard({ task, onEdit, onDelete, onMoveStatus, onViewDetails, isDarkMode }) {
  const priorityBadge =
    task.priority === 'HIGH'
      ? isDarkMode ? 'text-red-300 bg-red-950/60 border-red-900' : 'text-red-700 bg-red-50 border-red-200'
      : task.priority === 'MEDIUM'
      ? isDarkMode ? 'text-amber-300 bg-amber-950/60 border-amber-900' : 'text-amber-700 bg-amber-50 border-amber-200'
      : isDarkMode ? 'text-blue-300 bg-blue-950/60 border-blue-900' : 'text-blue-700 bg-blue-50 border-blue-200';

  const dueDateText = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  return (
    <div 
      onClick={() => onViewDetails(task)}
      className={`rounded-xl p-4 border flex flex-col gap-3 transition-all cursor-pointer ${
        isOverdue 
          ? 'border-red-500/50 bg-red-950/10 hover:border-red-500' 
          : isDarkMode 
          ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-100 shadow-none' 
          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${priorityBadge}`}>
            {task.priority} Priority
          </span>
          <div className="flex items-center gap-1">
            {isOverdue && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-md flex items-center gap-1 border border-red-200">
                <AlertTriangle className="w-3 h-3" /> Overdue
              </span>
            )}
            {task.estimatedHours && (
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-1 ${
                isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}>
                <Hourglass className="w-3 h-3 text-slate-400" /> {task.estimatedHours}h
              </span>
            )}
          </div>
        </div>
        <h4 className={`font-bold text-xs leading-snug ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{task.title}</h4>
        {task.description && (
          <p className={`text-[11px] mt-1 leading-relaxed line-clamp-3 whitespace-pre-line ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {task.description}
          </p>
        )}
      </div>

      <div className={`flex items-center justify-between border-t pt-2.5 text-xs ${
        isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
      }`}>
        <div className="flex items-center gap-2">
          {dueDateText && (
            <div className="flex items-center gap-1">
              <Calendar className={`w-3 h-3 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`} />
              <span className={`text-[11px] font-medium ${isOverdue ? 'text-red-500 font-bold' : ''}`}>{dueDateText}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button 
            onClick={() => onViewDetails(task)} 
            className="p-1 text-slate-400 hover:text-blue-500 rounded transition-colors cursor-pointer" 
            title="View Details & Start Timer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <div className={`flex items-center gap-1 border-r pr-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            {task.status !== 'TODO' && (
              <button title="Move to To Do" onClick={() => onMoveStatus(task, 'TODO')}
                className="px-1.5 py-0.5 text-slate-400 hover:text-slate-200 text-xs font-bold cursor-pointer">←</button>
            )}
            {task.status !== 'IN_PROGRESS' && (
              <button title="Move to In Progress" onClick={() => onMoveStatus(task, 'IN_PROGRESS')}
                className="px-1.5 py-0.5 text-blue-500 hover:text-blue-400 text-xs font-bold cursor-pointer">•</button>
            )}
            {task.status !== 'DONE' && (
              <button title="Move to Done" onClick={() => onMoveStatus(task, 'DONE')}
                className="px-1.5 py-0.5 text-emerald-500 hover:text-emerald-400 text-xs font-bold cursor-pointer">→</button>
            )}
          </div>
          <button onClick={() => onEdit(task)} className="p-1 text-slate-400 hover:text-blue-500 rounded transition-colors cursor-pointer" title="Edit">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text, isDarkMode }) {
  return (
    <div className={`py-8 text-center border border-dashed rounded-xl ${
      isDarkMode ? 'bg-slate-900/40 border-slate-800 text-slate-500' : 'bg-slate-100/50 border-slate-200 text-slate-400'
    }`}>
      <p className="text-xs italic">{text}</p>
    </div>
  );
}
