import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FolderSearch, 
  BrainCircuit, 
  GitBranch, 
  FileCheck2, 
  Milestone, 
  Bug, 
  Search, 
  Settings as SettingsIcon,
  RefreshCw,
  FolderOpen,
  Menu,
  X
} from 'lucide-react';

import FlowingMenu from './components/FlowingMenu';

import { api } from './utils/api';
import DashboardHome from './components/DashboardHome';
import RepoAnalyzer from './components/RepoAnalyzer';
import MemoryEngine from './components/MemoryEngine';
import GitIntelligence from './components/GitIntelligence';
import DecisionTracker from './components/DecisionTracker';
import FeatureTracker from './components/FeatureTracker';
import BugIntelligence from './components/BugIntelligence';
import SemanticSearch from './components/SemanticSearch';
import Settings from './components/Settings';

type Tab = 'dashboard' | 'repo' | 'memory' | 'git' | 'decisions' | 'features' | 'bugs' | 'search' | 'settings';

const flowingMenuItems = [
  { id: 'dashboard', link: '#', text: 'Dashboard', image: 'https://picsum.photos/600/400?random=1' },
  { id: 'repo', link: '#', text: 'Repo Analyzer', image: 'https://picsum.photos/600/400?random=2' },
  { id: 'memory', link: '#', text: 'Memory Engine', image: 'https://picsum.photos/600/400?random=3' },
  { id: 'git', link: '#', text: 'Git Intelligence', image: 'https://picsum.photos/600/400?random=4' },
  { id: 'decisions', link: '#', text: 'Decisions Log', image: 'https://picsum.photos/600/400?random=5' },
  { id: 'features', link: '#', text: 'Feature Tracker', image: 'https://picsum.photos/600/400?random=6' },
  { id: 'bugs', link: '#', text: 'Bug Intelligence', image: 'https://picsum.photos/600/400?random=7' },
  { id: 'search', link: '#', text: 'Semantic Search', image: 'https://picsum.photos/600/400?random=8' },
  { id: 'settings', link: '#', text: 'Settings', image: 'https://picsum.photos/600/400?random=9' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState<any>({
    status: "offline",
    repo_loaded: false,
    repository: null,
    total_decisions: 0,
    open_bugs: 0
  });
  const [syncing, setSyncing] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.getStatus();
      setStatus(res);
    } catch (err) {
      console.error("Failed to load status details:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll status occasionally to keep counts in sync
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleScan = async (path: string) => {
    setSyncing(true);
    try {
      await api.scanProject(path);
      await fetchStatus();
    } catch (err: any) {
      alert(`Scanning failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const tabsConfig = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'repo', name: 'Repo Analyzer', icon: FolderSearch },
    { id: 'memory', name: 'Memory Engine', icon: BrainCircuit },
    { id: 'git', name: 'Git Intelligence', icon: GitBranch },
    { id: 'decisions', name: 'Decisions Log', icon: FileCheck2 },
    { id: 'features', name: 'Feature Tracker', icon: Milestone },
    { id: 'bugs', name: 'Bug Intelligence', icon: Bug },
    { id: 'search', name: 'Semantic Search', icon: Search },
    { id: 'settings', name: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-full">
        <div>
          {/* Logo Header */}
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-xl shadow-inner">
              S
            </div>
            <div>
              <h1 className="font-extrabold text-slate-800 text-lg leading-none">Smriti AI</h1>
              <span className="text-xs font-semibold text-sky-500 uppercase tracking-widest">Agent Memory</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1">
            {tabsConfig.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive 
                      ? 'bg-sky-50 text-sky-600 shadow-sm border border-sky-100/50' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                  {tab.name}
                  {tab.id === 'bugs' && status.open_bugs > 0 && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                      {status.open_bugs}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Status Indicator Panel */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${status.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <div className="text-xs">
              <p className="font-bold text-slate-700">Daemon: {status.status === 'online' ? 'Connected' : 'Offline'}</p>
              <p className="text-slate-400 font-medium">Port 8000</p>
            </div>
            {syncing && <RefreshCw className="w-4 h-4 text-sky-500 animate-spin ml-auto" />}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Header bar */}
        <header className="h-16 border-b border-slate-100 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-slate-400" />
            {status.repo_loaded && status.repository ? (
              <div className="text-sm">
                <span className="font-bold text-slate-700">{status.repository.name}</span>
                <span className="text-slate-400 mx-2">|</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono font-medium">
                  {status.repository.path}
                </span>
              </div>
            ) : (
              <span className="text-sm font-semibold text-slate-400 italic">No workspace scanned yet</span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {status.repo_loaded && status.repository && (
              <div className="flex gap-4 text-xs font-semibold text-slate-500">
                <span>📁 {status.repository.total_files} files</span>
                <span>📝 {status.repository.total_lines.toLocaleString()} lines</span>
              </div>
            )}
            
            <button
              onClick={() => setActiveTab('settings')}
              className="px-4 py-2 text-xs font-bold text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors"
            >
              Scan Workspace
            </button>
            
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 text-slate-600 hover:text-sky-600 border border-slate-200 rounded-lg hover:bg-sky-50 transition-colors ml-2"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Tab View Switcher */}
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          {activeTab === 'dashboard' && (
            <DashboardHome status={status} fetchStatus={fetchStatus} setActiveTab={setActiveTab} />
          )}
          {activeTab === 'repo' && (
            <RepoAnalyzer status={status} />
          )}
          {activeTab === 'memory' && (
            <MemoryEngine />
          )}
          {activeTab === 'git' && (
            <GitIntelligence />
          )}
          {activeTab === 'decisions' && (
            <DecisionTracker status={status} fetchStatus={fetchStatus} />
          )}
          {activeTab === 'features' && (
            <FeatureTracker />
          )}
          {activeTab === 'bugs' && (
            <BugIntelligence fetchStatus={fetchStatus} />
          )}
          {activeTab === 'search' && (
            <SemanticSearch />
          )}
          {activeTab === 'settings' && (
            <Settings 
              status={status} 
              onScan={handleScan} 
              syncing={syncing} 
              fetchStatus={fetchStatus}
            />
          )}
        </div>
      </main>

      {/* Flowing Menu Overlay Modal */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col justify-center items-center">
          {/* Close button */}
          <button
            onClick={() => setMenuOpen(false)}
            className="absolute top-6 right-8 p-2.5 text-slate-600 hover:text-sky-600 border border-slate-200 rounded-lg hover:bg-sky-50 transition-colors z-50 bg-white"
            title="Close Menu"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="w-full h-full flex flex-col justify-center py-12">
            <FlowingMenu 
              items={flowingMenuItems} 
              onSelect={(id) => {
                setActiveTab(id as Tab);
                setMenuOpen(false);
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
