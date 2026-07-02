import React, { useState, useEffect } from 'react';
import { Bug, Plus, CheckCircle, AlertTriangle, User, Calendar } from 'lucide-react';
import { api } from '../utils/api';

interface BugItem {
  id: number;
  title: string;
  status: string;
  severity: string;
  related_files: string;
  description: string;
  created_at: string;
}

export default function BugIntelligence({ fetchStatus }: { fetchStatus: () => Promise<void> }) {
  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // New bug state
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [relatedFiles, setRelatedFiles] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBugs = async () => {
    setLoading(true);
    try {
      const res = await api.getBugs();
      setBugs(res);
    } catch (err) {
      console.error("Failed to load bugs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBugs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await api.createBug({
        title,
        severity,
        related_files: relatedFiles,
        description
      });
      setTitle('');
      setSeverity('Medium');
      setRelatedFiles('');
      setDescription('');
      setShowForm(false);
      
      await fetchBugs();
      await fetchStatus();
    } catch (err: any) {
      alert(`Failed to log bug: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (bug: BugItem) => {
    try {
      const nextStatus = bug.status === 'Open' ? 'Closed' : 'Open';
      await api.updateBug(bug.id, {
        status: nextStatus,
        severity: bug.severity,
        related_files: bug.related_files,
        description: bug.description
      });
      await fetchBugs();
      await fetchStatus();
    } catch (err) {
      console.error("Failed to update bug status:", err);
    }
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case "High":
        return "bg-rose-50 text-rose-600 border border-rose-100";
      case "Medium":
        return "bg-amber-50 text-amber-600 border border-amber-100";
      default:
        return "bg-sky-50 text-sky-600 border border-sky-100";
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Bug Intelligence</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Keep track of bugs and layout errors identified by developers or agents.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-md shadow-sky-500/10 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "View Active Bugs" : "Report Bug"}
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5 max-w-xl">
          <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3">Log Bug Incident</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Bug Title</label>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Button alignment on mobile"
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Severity</label>
              <select 
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300 bg-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Related Files (Comma separated)</label>
              <input 
                type="text"
                value={relatedFiles}
                onChange={(e) => setRelatedFiles(e.target.value)}
                placeholder="e.g. Header.tsx, Layout.css"
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Bug Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the bug behavior and replication steps."
              className="w-full h-24 p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300 text-sm"
              required
            />
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 pt-4 mt-6">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-bold rounded-xl shadow-md shadow-sky-500/10 transition-colors text-sm"
            >
              {submitting ? "Submitting..." : "Report Bug"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold rounded-xl transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : loading ? (
        <div className="py-12 text-center text-slate-400 font-semibold">Loading bugs log...</div>
      ) : bugs.length === 0 ? (
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-12 text-center max-w-lg mx-auto">
          <Bug className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-slate-700 font-extrabold text-base mt-4">Clean Repo: No Bugs</h3>
          <p className="text-slate-400 font-medium text-xs mt-2">
            No active bugs logged for this repository! High five!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bugs.map((bug) => (
            <div 
              key={bug.id}
              className={`border p-5 rounded-2xl shadow-sm transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                bug.status === 'Closed' 
                  ? 'bg-slate-50/50 border-slate-200/60 opacity-60' 
                  : 'bg-white border-slate-100 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1 shrink-0">
                  <AlertTriangle className={`w-5 h-5 ${bug.status === 'Closed' ? 'text-slate-300' : 'text-slate-400'}`} />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className={`font-extrabold text-sm md:text-base leading-snug ${bug.status === 'Closed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {bug.title}
                    </h4>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getSeverityStyle(bug.severity)}`}>
                      {bug.severity}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      bug.status === 'Closed' 
                        ? 'bg-slate-100 text-slate-500 border-slate-200' 
                        : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {bug.status}
                    </span>
                  </div>
                  
                  <p className="text-xs font-semibold text-slate-500">{bug.description}</p>
                  
                  {bug.related_files && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Related Files:</span>
                      {bug.related_files.split(",").map((file, index) => (
                        <span key={index} className="font-mono text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/50">
                          {file.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xxs font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-300" />
                      {new Date(bug.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleResolve(bug)}
                className={`px-4 py-2 border font-bold rounded-xl transition-all text-xs shrink-0 ${
                  bug.status === 'Closed' 
                    ? 'border-slate-200 text-slate-500 hover:bg-slate-100' 
                    : 'border-rose-200 text-rose-600 hover:bg-rose-50'
                }`}
              >
                {bug.status === 'Closed' ? 'Reopen Bug' : 'Mark Fixed'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
