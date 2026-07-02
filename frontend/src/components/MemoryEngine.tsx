import React, { useState, useEffect } from 'react';
import { Save, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { api } from '../utils/api';

interface RuleItem {
  key: string;
  content: string;
  updated_at: string;
}

export default function MemoryEngine() {
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>('project_goal');
  const [editorContent, setEditorContent] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.getRules();
      setRules(res);
      // Find content for default selected key
      const activeRule = res.find((r: RuleItem) => r.key === selectedKey);
      if (activeRule) {
        setEditorContent(activeRule.content);
      }
    } catch (err) {
      console.error("Failed to load rules list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  useEffect(() => {
    const activeRule = rules.find((r: RuleItem) => r.key === selectedKey);
    if (activeRule) {
      setEditorContent(activeRule.content);
    } else {
      setEditorContent('');
    }
  }, [selectedKey, rules]);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      await api.updateRule(selectedKey, editorContent);
      setSaveStatus("Memory rule updated and reindexed!");
      // Refresh local copy
      setRules(prev => 
        prev.map(r => r.key === selectedKey ? { ...r, content: editorContent, updated_at: new Date().toISOString() } : r)
      );
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const keyLabels: Record<string, string> = {
    project_goal: "Goal & Vision",
    business_logic: "Business Logic",
    coding_standards: "Coding Standards",
    naming_rules: "Naming Conventions",
    design_system: "Design System Tokens"
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Memory Engine</h2>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Specify core coding rules, vision, and naming conventions that agents must follow in this repository.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 font-semibold">Loading rules editor...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Rules categories sidebar */}
          <div className="bg-white border border-slate-100 p-4 rounded-3xl space-y-1 h-fit shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
              Memory Settings
            </span>
            {Object.keys(keyLabels).map((key) => {
              const isActive = selectedKey === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                    isActive 
                      ? 'bg-sky-50 text-sky-600 border border-sky-100/50' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  {keyLabels[key]}
                </button>
              );
            })}
          </div>

          {/* Rules editor workspace */}
          <div className="lg:col-span-3 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[450px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-sky-500" />
                  <span className="font-extrabold text-slate-800 text-sm">
                    Active Module: {keyLabels[selectedKey]}
                  </span>
                </div>
                {saveStatus && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4" /> {saveStatus}
                  </span>
                )}
              </div>

              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="w-full h-80 p-4 border border-slate-100 rounded-2xl font-mono text-sm focus:outline-none focus:border-sky-300 transition-colors"
                placeholder={`Write markdown rules for ${keyLabels[selectedKey]}...`}
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
              <span className="text-xs text-slate-400 font-semibold">
                Saves locally. Will be injected into AI prompts for relevant queries.
              </span>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-bold rounded-xl flex items-center gap-2 shadow-md shadow-sky-500/10 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save and Reindex"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
