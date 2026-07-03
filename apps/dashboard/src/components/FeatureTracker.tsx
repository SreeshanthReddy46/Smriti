import React, { useState, useEffect } from 'react';
import { Milestone, Plus, CheckCircle2, Circle, Clock } from 'lucide-react';
import { api } from '../utils/api';

interface Feature {
  id: number;
  name: string;
  progress: number;
  status: string;
  description: string;
}

export default function FeatureTracker() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // New feature form state
  const [name, setName] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Not Started');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const res = await api.getFeatures();
      setFeatures(res);
    } catch (err) {
      console.error("Failed to load features:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await api.addFeature({ name, progress, status, description });
      setName('');
      setProgress(0);
      setStatus('Not Started');
      setDescription('');
      setShowForm(false);
      fetchFeatures();
    } catch (err: any) {
      alert(`Failed to add feature: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const updateProgress = async (id: number, currentProgress: number, currentStatus: string, desc: string) => {
    let nextProgress = currentProgress + 10;
    if (nextProgress > 100) nextProgress = 100;
    
    let nextStatus = currentStatus;
    if (nextProgress === 100) nextStatus = "Completed";
    else if (nextProgress > 0) nextStatus = "In Progress";

    try {
      await api.updateFeature(id, {
        progress: nextProgress,
        status: nextStatus,
        description: desc
      });
      fetchFeatures();
    } catch (err) {
      console.error("Failed to update feature progress:", err);
    }
  };

  const getStatusIcon = (stat: string) => {
    switch (stat) {
      case "Completed":
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />;
      case "In Progress":
        return <Clock className="w-5 h-5 text-sky-500 fill-sky-50 animate-pulse" />;
      default:
        return <Circle className="w-5 h-5 text-slate-300" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Feature Tracker</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Map out features roadmap progress for your agentic developers.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-md shadow-sky-500/10 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "View Features" : "Add Feature"}
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5 max-w-xl">
          <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3">Log New Feature</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Feature Name</label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rate Limiting Middleware"
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Status</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300 bg-white"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Initial Progress (%)</label>
              <input 
                type="number"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail what tasks this feature covers."
              className="w-full h-24 p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300 text-sm"
            />
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 pt-4 mt-6">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-bold rounded-xl shadow-md shadow-sky-500/10 transition-colors text-sm"
            >
              {submitting ? "Saving..." : "Add Feature"}
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
        <div className="py-12 text-center text-slate-400 font-semibold">Loading features list...</div>
      ) : features.length === 0 ? (
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-12 text-center max-w-lg mx-auto">
          <Milestone className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-slate-700 font-extrabold text-base mt-4">No Features Tracked</h3>
          <p className="text-slate-400 font-medium text-xs mt-2">
            No features found. Log your project features to start tracking development progress.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {features.map((feat) => (
            <div 
              key={feat.id}
              className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1">
                  {getStatusIcon(feat.status)}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-slate-800 text-sm md:text-base leading-snug">{feat.name}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      feat.status === "Completed" 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : feat.status === "In Progress" 
                        ? 'bg-sky-50 text-sky-600 border border-sky-100' 
                        : 'bg-slate-50 text-slate-400 border border-slate-200'
                    }`}>
                      {feat.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500">{feat.description}</p>
                  
                  {/* Progress bar */}
                  <div className="flex items-center gap-3 mt-3 max-w-md">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-sky-500 h-full transition-all duration-300"
                        style={{ width: `${feat.progress}%` }}
                      />
                    </div>
                    <span className="font-mono text-xxs font-bold text-slate-400">{feat.progress}%</span>
                  </div>
                </div>
              </div>

              {feat.status !== "Completed" && (
                <button
                  onClick={() => updateProgress(feat.id, feat.progress, feat.status, feat.description)}
                  className="self-end md:self-center px-4 py-2 border border-sky-200 text-sky-600 hover:bg-sky-50 font-bold rounded-xl transition-all text-xs shrink-0"
                >
                  Bump Progress
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
