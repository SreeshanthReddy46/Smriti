import React, { useState, useEffect } from 'react';
import { Folder, FileCode, ChevronRight, ChevronDown, HelpCircle, HardDrive } from 'lucide-react';
import { api } from '../utils/api';

interface FileNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  size?: number;
  lines?: number;
  children?: FileNode[];
}

export default function RepoAnalyzer({ status }: { status: any }) {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const fetchRepoTree = async () => {
    if (!status.repo_loaded) return;
    setLoading(true);
    try {
      const res = await api.getRepository();
      setTree(res);
      // Auto expand root node
      if (res && res.name) {
        setExpandedNodes({ [res.path || "root"]: true });
      }
    } catch (err) {
      console.error("Failed to load folder tree:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepoTree();
  }, [status.repo_loaded]);

  const toggleExpand = (path: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Recursive tree render
  const renderNode = (node: FileNode) => {
    const isDir = node.type === 'directory';
    const isExpanded = expandedNodes[node.path] || false;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.path} className="ml-4 font-medium">
        <div 
          onClick={() => isDir && toggleExpand(node.path)}
          className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-sm select-none transition-colors ${
            isDir 
              ? 'hover:bg-slate-50 cursor-pointer text-slate-700' 
              : 'text-slate-500'
          }`}
        >
          {isDir ? (
            <>
              {hasChildren ? (
                isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-transparent" />
              )}
              <Folder className="w-4.5 h-4.5 text-sky-400 fill-sky-50" />
              <span className="font-bold">{node.name}</span>
              <span className="text-xxs text-slate-400 font-medium">({node.children?.length || 0} items)</span>
            </>
          ) : (
            <>
              <ChevronRight className="w-4 h-4 text-transparent" />
              <FileCode className="w-4.5 h-4.5 text-slate-400" />
              <span>{node.name}</span>
              {node.lines !== undefined && (
                <span className="text-xxs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                  {node.lines} lines
                </span>
              )}
              {node.size !== undefined && (
                <span className="text-xxs text-slate-300">
                  {node.size > 1024 ? `${(node.size / 1024).toFixed(1)} KB` : `${node.size} B`}
                </span>
              )}
            </>
          )}
        </div>
        
        {isDir && isExpanded && hasChildren && (
          <div className="border-l border-slate-100 ml-3.5 pl-1.5">
            {node.children!.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Repository Analyzer</h2>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Explore the directory hierarchy and structure scanned by Smriti.
        </p>
      </div>

      {!status.repo_loaded ? (
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-12 text-center max-w-lg mx-auto">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-slate-700 font-extrabold text-base mt-4">No repository has been indexed</h3>
          <p className="text-slate-400 font-medium text-xs mt-2">
            Please configure a project folder path in the settings to analyze and index repository contents.
          </p>
        </div>
      ) : loading ? (
        <div className="py-12 text-center text-slate-400 font-semibold text-sm">
          Loading file structure...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* File tree browser */}
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm overflow-x-auto min-h-[400px]">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
              <HardDrive className="w-5 h-5 text-slate-400" />
              <span className="font-extrabold text-slate-800 text-sm">File Tree Browser</span>
            </div>
            
            {tree ? (
              <div className="space-y-1">
                {renderNode(tree)}
              </div>
            ) : (
              <p className="text-slate-400 text-xs font-semibold p-4">Failed to load tree data.</p>
            )}
          </div>

          {/* Repo statistics sidebar */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3">Project Metadata</h3>
              <div className="space-y-3 text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Framework:</span>
                  <span className="text-slate-800">{status.repository?.framework || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Languages:</span>
                  <span className="text-slate-800 text-right">{status.repository?.languages || "None"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Code Files:</span>
                  <span className="text-slate-800">{status.repository?.total_files}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Code Lines:</span>
                  <span className="text-slate-800">{status.repository?.total_lines.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Scanned:</span>
                  <span className="text-slate-500 text-right">
                    {status.repository?.last_scanned ? new Date(status.repository.last_scanned).toLocaleString() : "Never"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
