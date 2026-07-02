import React from 'react';
import { 
  FileCheck2, 
  Bug, 
  Folder, 
  Settings, 
  BrainCircuit, 
  Search,
  ArrowRight
} from 'lucide-react';

interface HomeProps {
  status: any;
  fetchStatus: () => Promise<void>;
  setActiveTab: (tab: any) => void;
}

export default function DashboardHome({ status, fetchStatus, setActiveTab }: HomeProps) {
  const cards = [
    {
      title: "Workspace Path",
      value: status.repo_loaded && status.repository ? status.repository.name : "Not Loaded",
      desc: status.repo_loaded && status.repository ? status.repository.path : "Set repository folder in Settings",
      icon: Folder,
      color: "text-sky-600 bg-sky-50",
      tab: "settings"
    },
    {
      title: "Archived Decisions",
      value: status.total_decisions,
      desc: "Architecture records stored",
      icon: FileCheck2,
      color: "text-indigo-600 bg-indigo-50",
      tab: "decisions"
    },
    {
      title: "Active Open Bugs",
      value: status.open_bugs,
      desc: "Bugs logged in this project",
      icon: Bug,
      color: "text-rose-600 bg-rose-50",
      tab: "bugs"
    },
    {
      title: "Vector DB Chunks",
      value: status.repo_loaded && status.repository ? "Indexed" : "No Vectors",
      desc: status.repo_loaded && status.repository ? "Embeddings in Qdrant DB" : "Scan project to generate embeddings",
      icon: BrainCircuit,
      color: "text-emerald-600 bg-emerald-50",
      tab: "search"
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-sky-50 via-indigo-50/30 to-white border border-sky-100 rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Never let your coding agent forget.</h2>
          <p className="text-slate-500 font-semibold mt-2 max-w-xl">
            Smriti keeps your ADR decisions, coding rules, git commit history, and active sprint items in a persistent local memory index.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('settings')}
          className="self-start md:self-center px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all duration-200"
        >
          Get Started <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx}
              onClick={() => setActiveTab(card.tab)}
              className="bg-white border border-slate-100 p-6 rounded-2xl hover:shadow-md hover:border-slate-200 transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{card.title}</span>
                <div className={`p-2 rounded-xl ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-extrabold text-slate-800">{card.value}</h3>
                <p className="text-xs text-slate-400 font-medium mt-1 truncate">{card.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Launch & Diagnostic details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Memory System Diagnostics */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-8 space-y-6">
          <h3 className="font-extrabold text-slate-800 text-lg border-b border-slate-100 pb-4">Smriti Core Engine Diagnostics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-slate-100 p-5 rounded-2xl bg-slate-50/50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Relational Storage</span>
              <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                <span>Database:</span>
                <span className="font-mono text-xs bg-slate-200 px-2 py-0.5 rounded">SQLite 3</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold text-slate-700 mt-2">
                <span>File Path:</span>
                <span className="font-mono text-xs text-slate-400">backend/smriti.db</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold text-slate-700 mt-2">
                <span>Tables initialized:</span>
                <span className="text-emerald-600">✓ Yes</span>
              </div>
            </div>

            <div className="border border-slate-100 p-5 rounded-2xl bg-slate-50/50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Semantic Vector Index</span>
              <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                <span>Engine:</span>
                <span className="font-mono text-xs bg-slate-200 px-2 py-0.5 rounded">Qdrant Local</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold text-slate-700 mt-2">
                <span>Dimension params:</span>
                <span className="font-mono text-xs">384 (Cosine)</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold text-slate-700 mt-2">
                <span>Active Model:</span>
                <span className="text-slate-500 font-mono text-xs">hashing_fallback</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions panel */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-6">
          <h3 className="font-extrabold text-slate-800 text-lg border-b border-slate-100 pb-4">Quick Operations</h3>
          
          <div className="space-y-3">
            <button
              onClick={() => setActiveTab('search')}
              className="w-full flex items-center justify-between p-4 border border-slate-100 hover:border-sky-100 hover:bg-sky-50/30 rounded-2xl transition-all duration-200 text-left font-bold text-slate-700 hover:text-sky-600 text-sm group"
            >
              <span className="flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-400 group-hover:text-sky-500" />
                Query Semantic Search
              </span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => setActiveTab('memory')}
              className="w-full flex items-center justify-between p-4 border border-slate-100 hover:border-sky-100 hover:bg-sky-50/30 rounded-2xl transition-all duration-200 text-left font-bold text-slate-700 hover:text-sky-600 text-sm group"
            >
              <span className="flex items-center gap-3">
                <BrainCircuit className="w-5 h-5 text-slate-400 group-hover:text-sky-500" />
                Edit Coding Standards
              </span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className="w-full flex items-center justify-between p-4 border border-slate-100 hover:border-sky-100 hover:bg-sky-50/30 rounded-2xl transition-all duration-200 text-left font-bold text-slate-700 hover:text-sky-600 text-sm group"
            >
              <span className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-slate-400 group-hover:text-sky-500" />
                Configure LLM Keys
              </span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
