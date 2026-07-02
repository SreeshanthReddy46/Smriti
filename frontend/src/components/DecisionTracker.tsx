import React, { useState, useEffect } from 'react';
import { FileText, Plus, CheckCircle, XCircle, HelpCircle, User, Calendar, MessageSquare } from 'lucide-react';
import { api } from '../utils/api';

interface Decision {
  id: number;
  title: string;
  status: string;
  author: string;
  reason: string;
  alternatives: string;
  created_at: string;
}

export default function DecisionTracker({ status, fetchStatus }: { status: any, fetchStatus: () => Promise<void> }) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [adrStatus, setAdrStatus] = useState('Accepted');
  const [author, setAuthor] = useState('');
  const [reason, setReason] = useState('');
  const [alternatives, setAlternatives] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDecisions = async () => {
    setLoading(true);
    try {
      const res = await api.getDecisions();
      setDecisions(res);
    } catch (err) {
      console.error("Failed to load decisions list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !reason.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      await api.createDecision({
        title,
        status: adrStatus,
        author,
        reason,
        alternatives
      });
      
      // Clear form
      setTitle('');
      setAuthor('');
      setReason('');
      setAlternatives('');
      setShowForm(false);
      
      // Refresh list and dashboard stats
      await fetchDecisions();
      await fetchStatus();
    } catch (err: any) {
      alert(`Failed to save decision: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (stat: string) => {
    switch (stat) {
      case "Accepted":
        return <CheckCircle className="w-5 h-5 text-emerald-500 fill-emerald-50" />;
      case "Rejected":
        return <XCircle className="w-5 h-5 text-rose-500 fill-rose-50" />;
      default:
        return <HelpCircle className="w-5 h-5 text-amber-500 fill-amber-50" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Decisions Tracker (ADRs)</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Maintain a permanent Architecture Decision Record log for your AI agent to read.
          </p>
        </div>
        
        <button
          onClick={() => setShowForm(!showForm)}
          className="self-start sm:self-center px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-md shadow-sky-500/10 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "View Log" : "Log Architecture Decision"}
        </button>
      </div>

      {showForm ? (
        /* ADR creation form */
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 max-w-2xl">
          <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3">New Architecture Decision Record</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Decision Title *</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Choose PostgreSQL over MongoDB" 
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300 transition-colors"
                required
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Author *</label>
              <input 
                type="text" 
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Sreeshanth" 
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300 transition-colors"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Status</label>
              <select 
                value={adrStatus}
                onChange={(e) => setAdrStatus(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300 bg-white transition-colors"
              >
                <option value="Accepted">Accepted</option>
                <option value="Proposed">Proposed</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Alternatives Considered</label>
              <input 
                type="text" 
                value={alternatives}
                onChange={(e) => setAlternatives(e.target.value)}
                placeholder="e.g. MongoDB, DynamoDB" 
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Reasoning / Justification *</label>
            <textarea 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. We require robust support for relational schemas alongside complex JSON filtering (JSONB)."
              className="w-full h-32 p-4 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-300 transition-colors text-sm"
              required
            />
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 pt-4 mt-6">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-bold rounded-xl shadow-md shadow-sky-500/10 transition-colors text-sm"
            >
              {submitting ? "Saving..." : "Save and Index Decision"}
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
        <div className="py-12 text-center text-slate-400 font-semibold">Loading ADR log...</div>
      ) : decisions.length === 0 ? (
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-12 text-center max-w-lg mx-auto">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-slate-700 font-extrabold text-base mt-4">No Decisions Logged</h3>
          <p className="text-slate-400 font-medium text-xs mt-2">
            Keep track of architectural decisions. Click "Log Architecture Decision" above to record your first choice.
          </p>
        </div>
      ) : (
        /* Decisions list */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {decisions.map((dec) => (
            <div 
              key={dec.id} 
              className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-2.5 items-center">
                    {getStatusIcon(dec.status)}
                    <h4 className="font-extrabold text-slate-800 text-base leading-snug">{dec.title}</h4>
                  </div>
                  <span className="text-xxs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                    #{dec.id}
                  </span>
                </div>

                <div className="text-sm font-semibold text-slate-600">
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-1">Reason / Intent</span>
                  <p className="text-slate-500 whitespace-pre-wrap">{dec.reason}</p>
                </div>

                {dec.alternatives && (
                  <div className="text-sm font-semibold text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-1">Alternatives Considered</span>
                    <p className="text-slate-500 font-medium italic">{dec.alternatives}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6 text-xxs font-bold text-slate-400">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-300" />
                  {dec.author}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-300" />
                  {new Date(dec.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
