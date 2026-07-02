import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ShieldCheck, KeyRound, FolderOpen, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../utils/api';

interface SettingsProps {
  status: any;
  onScan: (path: string) => Promise<void>;
  syncing: boolean;
  fetchStatus: () => Promise<void>;
}

export default function Settings({ status, onScan, syncing, fetchStatus }: SettingsProps) {
  const [llmProvider, setLlmProvider] = useState('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [scanPath, setScanPath] = useState('');
  
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.getSettings();
        setLlmProvider(res.llm_provider);
        setOllamaUrl(res.ollama_url);
        setScanPath(res.last_scanned_path);
        
        // Keys are masked by server or just empty string placeholder
        if (res.gemini_api_key_set) setGeminiKey('••••••••••••••••');
        if (res.openai_api_key_set) setOpenaiKey('••••••••••••••••');
      } catch (err) {
        console.error("Failed to load settings details:", err);
      }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveSuccess(false);

    try {
      // Clean up masked key values before sending
      const gemini_val = geminiKey === '••••••••••••••••' ? undefined : geminiKey;
      const openai_val = openaiKey === '••••••••••••••••' ? undefined : openaiKey;

      await api.saveSettings({
        llm_provider: llmProvider,
        gemini_api_key: gemini_val,
        openai_api_key: openai_val,
        ollama_url: ollamaUrl
      });
      setSaveSuccess(true);
      await fetchStatus();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save configurations: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTriggerScan = () => {
    if (!scanPath.trim()) {
      alert("Please provide a valid directory path.");
      return;
    }
    onScan(scanPath);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Configuration & Sync</h2>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Manage local repository scanning and configure AI provider API keys.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column: Scan repository */}
        <div className="md:col-span-2 space-y-6">
          {/* Repository Scanner Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FolderOpen className="w-5 h-5 text-sky-500" />
              <span className="font-extrabold text-slate-800 text-sm">Scan Repository Folder</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Absolute Directory Path</label>
                <input 
                  type="text"
                  value={scanPath}
                  onChange={(e) => setScanPath(e.target.value)}
                  placeholder="e.g. C:\Users\hp\my-project"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300 font-medium"
                />
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                  Provide the local folder path containing your project code to trigger Git Log and AST scanning.
                </span>
              </div>

              <button
                onClick={handleTriggerScan}
                disabled={syncing}
                className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-sky-500/10 transition-colors text-sm"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Indexing Repository Chunks...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" /> Scan and Index Repository
                  </>
                )}
              </button>
            </div>
          </div>

          {/* LLM credentials form */}
          <form onSubmit={handleSaveSettings} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-sky-500" />
                <span className="font-extrabold text-slate-800 text-sm">LLM Engine Configurations</span>
              </div>
              {saveSuccess && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">LLM Provider</label>
                <select
                  value={llmProvider}
                  onChange={(e) => setLlmProvider(e.target.value)}
                  className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300 bg-white"
                >
                  <option value="gemini">Google Gemini (Recommended)</option>
                  <option value="ollama">Ollama (Local LLM)</option>
                  <option value="openai">OpenAI GPT</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Ollama URL (for local models)</label>
                <input 
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300 font-medium"
                />
              </div>

              {llmProvider === 'gemini' && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Gemini API Key</label>
                  <input 
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="Enter your Gemini Key (AI Studio)"
                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300 font-mono"
                  />
                </div>
              )}

              {llmProvider === 'openai' && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">OpenAI API Key</label>
                  <input 
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300 font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4 mt-6">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-bold rounded-xl shadow-md shadow-sky-500/10 transition-colors text-sm"
              >
                {savingSettings ? "Saving Settings..." : "Save Settings"}
              </button>
            </div>
          </form>
        </div>

        {/* Right column: Security panel */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span className="font-extrabold text-slate-800 text-sm">Local Storage Security</span>
            </div>

            <div className="space-y-3 text-xs font-semibold text-slate-500 leading-relaxed">
              <p>
                ✓ **Local-Only Storage**: Smriti runs a local engine on your machine. Your scanned code structures and git logs are stored in a local SQLite file database.
              </p>
              <p>
                ✓ **Offline Embedding Calculation**: Vectors are calculated using a hashing trick inside the Python daemon. No files are uploaded to third-party services during vectorization.
              </p>
              <p>
                ✓ **LLM Privacy**: Cloud APIs are only queried when triggering the Chat module using your direct configured API key.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
