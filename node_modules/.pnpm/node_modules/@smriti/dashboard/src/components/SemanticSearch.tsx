import React, { useState } from 'react';
import { Search, Brain, FileText, Database, GitCommit, FileCode, CheckCircle, RefreshCw } from 'lucide-react';
import { api } from '../utils/api';

interface Citation {
  id: number;
  type: string;
  file_path: string;
  snippet: string;
  score: number;
}

import { maskPath } from '../utils/security';

export default function SemanticSearch({ privacyMode }: { privacyMode: boolean }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [promptContext, setPromptContext] = useState<string | null>(null);
  const [tokens, setTokens] = useState<number>(0);
  const [showContext, setShowContext] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setAnswer(null);
    setPromptContext(null);
    setCitations([]);
    
    try {
      // 1. Fetch prompt context stats
      const contextInfo = await api.getPromptContext(query);
      setPromptContext(contextInfo.context_text);
      setCitations(contextInfo.citations);
      setTokens(contextInfo.estimated_tokens);

      // 2. Fetch LLM/Mock Answer
      const chatRes = await api.chat(query);
      setAnswer(chatRes.answer);
    } catch (err: any) {
      alert(`Search failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "decision":
        return <Database className="w-4 h-4 text-indigo-500" />;
      case "commit":
        return <GitCommit className="w-4 h-4 text-emerald-500" />;
      case "rule":
        return <Brain className="w-4 h-4 text-sky-500" />;
      default:
        return <FileCode className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Semantic Search & Context Engine</h2>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Ask questions about architectural decisions, coding guidelines, bugs, or file structures in this repository.
        </p>
      </div>

      {/* Query search form */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Why PostgreSQL? / Show JWT auth flow / What is the design rule?"
            className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-300 text-sm font-medium shadow-sm transition-colors"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-sky-500/10 transition-colors shrink-0 text-sm"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4" /> Ask Memory
            </>
          )}
        </button>
      </form>

      {loading && (
        <div className="py-12 text-center text-slate-400 font-semibold text-sm">
          Searching Qdrant database and compiling context prompt...
        </div>
      )}

      {answer && (
        <div className="space-y-8 animate-fade-in">
          {/* Answer Box */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sky-600 border-b border-slate-100 pb-3">
              <CheckCircle className="w-5 h-5" />
              <span className="font-extrabold text-sm uppercase tracking-wider">Answer from persistent memory</span>
            </div>
            
            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {answer}
            </div>
          </div>

          {/* Tokens and Context block */}
          {promptContext && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                <span className="font-extrabold text-slate-800 text-sm">Prompt Assembly Context ({tokens} tokens)</span>
                <button
                  onClick={() => setShowContext(!showContext)}
                  className="text-xs font-bold text-sky-600 hover:underline self-start sm:self-center"
                >
                  {showContext ? "Hide Compiled Context Payload" : "Show Compiled Context Payload"}
                </button>
              </div>

              {showContext && (
                <pre className={`font-mono text-[10px] p-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 overflow-x-auto whitespace-pre-wrap max-h-72 transition-all duration-300 ${
                  privacyMode ? 'filter blur-md hover:blur-none select-none cursor-pointer' : ''
                }`} title={privacyMode ? "Hover to reveal context payload securely" : undefined}>
                  {promptContext}
                </pre>
              )}
            </div>
          )}

          {/* Citations index */}
          {citations.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-800 text-sm">Retrieved Context Sources</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {citations.map((cite) => (
                  <div 
                    key={cite.id}
                    className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2 text-slate-700 font-bold text-xxs uppercase tracking-wider">
                          {getSourceIcon(cite.type)}
                          <span>Source {cite.id}: {cite.type}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          Score {(cite.score * 100).toFixed(0)}%
                        </span>
                      </div>
                      
                      {cite.file_path && (
                        <div className="text-[10px] font-mono font-semibold text-slate-400">
                          Path: {maskPath(cite.file_path, privacyMode)}
                        </div>
                      )}

                      <p className={`text-xxs font-medium font-mono text-slate-500 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/50 line-clamp-3 transition-all duration-300 ${
                        privacyMode ? 'filter blur-sm hover:blur-none select-none cursor-pointer' : ''
                      }`} title={privacyMode ? "Hover to reveal snippet securely" : undefined}>
                        {cite.snippet}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
