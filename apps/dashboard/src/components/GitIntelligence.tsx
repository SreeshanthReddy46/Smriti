import React, { useState, useEffect } from 'react';
import { GitCommit, Tag, Calendar, User, Eye, EyeOff } from 'lucide-react';
import { api } from '../utils/api';

interface CommitItem {
  sha: string;
  message: string;
  author: string;
  date: string;
  files_changed: string[];
  summary: string;
  intent: string;
  affected_features: string[];
  remaining_work: string;
}

export default function GitIntelligence() {
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSha, setExpandedSha] = useState<string | null>(null);

  const fetchCommits = async () => {
    setLoading(true);
    try {
      const res = await api.getCommits();
      setCommits(res);
    } catch (err) {
      console.error("Failed to load commits history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommits();
  }, []);

  const toggleExpand = (sha: string) => {
    setExpandedSha(prev => prev === sha ? null : sha);
  };

  const getIntentStyle = (intent: string) => {
    switch (intent) {
      case "New Feature":
        return "bg-emerald-50 text-emerald-600 border border-emerald-100";
      case "Bug Fix":
        return "bg-rose-50 text-rose-600 border border-rose-100";
      case "Code Refactoring":
        return "bg-amber-50 text-amber-600 border border-amber-100";
      case "Documentation":
        return "bg-sky-50 text-sky-600 border border-sky-100";
      default:
        return "bg-slate-50 text-slate-600 border border-slate-100";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Git Intelligence</h2>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Explore commit history, files changed, and AI-categorized developer intents.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 font-semibold">Loading commits feed...</div>
      ) : commits.length === 0 ? (
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-12 text-center max-w-lg mx-auto">
          <GitCommit className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-slate-700 font-extrabold text-base mt-4">No git history loaded</h3>
          <p className="text-slate-400 font-medium text-xs mt-2">
            Scan a git repository folder in settings to read commit logs and index intents.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl">
          {commits.map((commit) => {
            const isExpanded = expandedSha === commit.sha;
            return (
              <div 
                key={commit.sha}
                className="bg-white border border-slate-100 rounded-2xl hover:shadow-sm transition-all duration-200"
              >
                {/* Header card info */}
                <div 
                  onClick={() => toggleExpand(commit.sha)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400 mt-0.5">
                      <GitCommit className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm md:text-base leading-snug">
                        {commit.summary}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-xxs font-semibold text-slate-400 mt-2">
                        <span className="flex items-center gap-1 font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {commit.sha.substring(0, 8)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-300" />
                          {commit.author.split(" <")[0]}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-300" />
                          {new Date(commit.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center">
                    <span className={`px-2.5 py-1 text-xxs font-bold rounded-full ${getIntentStyle(commit.intent)}`}>
                      {commit.intent}
                    </span>
                    <button className="p-2 text-slate-300 hover:text-slate-600 rounded-lg">
                      {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-6 bg-slate-50/20 space-y-6">
                    {/* Changed files */}
                    <div>
                      <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-2">Changed Files</span>
                      <div className="flex flex-wrap gap-1.5">
                        {commit.files_changed.map((file, idx) => (
                          <span key={idx} className="font-mono text-xxs font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded">
                            {file}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Commit stats and metadata */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white border border-slate-200/50 p-4 rounded-xl">
                        <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-2">Affected Features</span>
                        <div className="flex flex-wrap gap-1">
                          {commit.affected_features.map((feat, idx) => (
                            <span key={idx} className="flex items-center gap-1 px-2.5 py-0.5 text-xxs font-bold bg-sky-50 text-sky-600 rounded-full border border-sky-100">
                              <Tag className="w-3 h-3" />
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200/50 p-4 rounded-xl">
                        <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-2">Remaining Tasks</span>
                        <p className="text-xs font-semibold text-slate-600">{commit.remaining_work}</p>
                      </div>
                    </div>

                    {/* Full commit message */}
                    <div>
                      <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-2">Full Commit Message</span>
                      <pre className="font-mono text-xxs p-4 bg-white border border-slate-100 text-slate-500 rounded-xl whitespace-pre-wrap">
                        {commit.message}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
