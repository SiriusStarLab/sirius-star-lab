import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, FolderOpen, ChevronRight, ChevronDown, Code, Save,
  RefreshCw, Download, Upload, Search, X, Loader2, AlertCircle,
  CheckCircle2, Play, Terminal, Eye
} from 'lucide-react';
import { getApiBase } from '@/lib/api-base';

type FileNode = {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
};

type DeployedApp = {
  appName: string;
  slug: string;
  url: string;
  port: number;
  pid?: number;
  deployedAt: string;
  projectId?: number;
  sessionId?: number;
};

interface CodeEditorPanelProps {
  pin: string;
  sessionId?: number | null;
  files?: Record<string, string>;
  onFilesChange?: (files: Record<string, string>) => void;
  onDeploy?: () => void;
}

export function CodeEditorPanel({ pin, sessionId, files = {}, onFilesChange, onDeploy }: CodeEditorPanelProps) {
  const API = getApiBase();
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const editorRef = useRef<any>(null);

  // Build file tree from files object
  useEffect(() => {
    const tree: FileNode[] = [];
    const pathMap = new Map<string, FileNode>();

    Object.keys(files).sort().forEach(path => {
      const parts = path.split('/');
      const fileName = parts[parts.length - 1];
      
      let currentLevel = tree;
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (i === parts.length - 1) {
          // File
          const fileNode: FileNode = {
            name: part,
            path: currentPath,
            type: 'file',
            content: files[path]
          };
          currentLevel.push(fileNode);
          pathMap.set(currentPath, fileNode);
        } else {
          // Folder
          let folderNode = currentLevel.find(n => n.name === part && n.type === 'folder');
          if (!folderNode) {
            folderNode = {
              name: part,
              path: currentPath,
              type: 'folder',
              children: []
            };
            currentLevel.push(folderNode);
            pathMap.set(currentPath, folderNode);
          }
          currentLevel = folderNode.children!;
        }
      }
    });

    setFileTree(tree);
    
    // Auto-select first file if none selected
    if (!selectedFile && Object.keys(files).length > 0) {
      const firstFile = Object.keys(files).sort()[0];
      setSelectedFile(firstFile);
      setFileContent(files[firstFile] || '');
    }
  }, [files]);

  // Update content when selected file changes
  useEffect(() => {
    if (selectedFile && files[selectedFile] !== undefined) {
      setFileContent(files[selectedFile]);
      setIsDirty(false);
    }
  }, [selectedFile, files]);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileSelect = (path: string, isFolder: boolean) => {
    if (isFolder) {
      toggleFolder(path);
    } else {
      // Save current file if dirty before switching
      if (isDirty && selectedFile) {
        handleSave();
      }
      setSelectedFile(path);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && value !== fileContent) {
      setFileContent(value);
      setIsDirty(true);
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !isDirty) return;
    
    setSaving(true);
    try {
      const newFiles = { ...files, [selectedFile]: fileContent };
      onFilesChange?.(newFiles);
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeploy = async () => {
    if (!sessionId) return;
    
    setDeploying(true);
    try {
      await fetch(`${API}lab/app-builder/deploy/${sessionId}`, {
        method: 'POST',
        headers: { 'x-lab-pin': pin }
      });
      onDeploy?.();
    } catch (err) {
      console.error('Deploy failed:', err);
    } finally {
      setDeploying(false);
    }
  };

  const getLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'py': 'python',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml',
      'xml': 'xml',
      'sql': 'sql',
      'sh': 'shell',
      'txt': 'plaintext'
    };
    return langMap[ext || ''] || 'plaintext';
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes
      .filter(node => !searchTerm || node.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(node => (
        <div key={node.path}>
          <div
            onClick={() => handleFileSelect(node.path, node.type === 'folder')}
            className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 rounded transition-colors"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {node.type === 'folder' ? (
              <>
                {expandedFolders.has(node.path) ? (
                  <ChevronDown className="w-3 h-3 text-copper-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-copper-400" />
                )}
                <FolderOpen className="w-4 h-4 text-copper-400" />
                <span className="text-sm text-slate-300">{node.name}</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-sky-400 ml-4" />
                <span
                  className={`text-sm ${
                    selectedFile === node.path ? 'text-white font-medium' : 'text-slate-400'
                  }`}
                >
                  {node.name}
                </span>
              </>
            )}
          </div>
          {node.type === 'folder' && expandedFolders.has(node.path) && node.children && (
            renderFileTree(node.children, depth + 1)
          )}
        </div>
      ));
  };

  return (
    <div className="flex h-full bg-slate-950 text-white">
      {/* File Tree Sidebar */}
      <div className="w-64 border-r border-slate-800 flex flex-col">
        <div className="p-3 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Code className="w-5 h-5 text-copper-400" />
            <h3 className="text-sm font-semibold text-white">Files</h3>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-copper-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {fileTree.length > 0 ? (
            renderFileTree(fileTree)
          ) : (
            <div className="p-4 text-center text-slate-500 text-sm">
              No files to display
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-800 space-y-2">
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-copper-600 hover:bg-copper-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded transition-colors text-sm font-medium"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save{isDirty ? ' *' : ''}
              </>
            )}
          </button>
          
          <button
            onClick={handleDeploy}
            disabled={deploying || !sessionId}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded transition-colors text-sm font-medium"
          >
            {deploying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Deploy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            <div className="h-10 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <span className="text-sm text-white font-medium">{selectedFile}</span>
                {isDirty && <span className="text-xs text-copper-400">● Modified</span>}
              </div>
              <div className="flex items-center gap-2">
                {isDirty && (
                  <span className="text-xs text-slate-500">Press Ctrl+S to save</span>
                )}
              </div>
            </div>
            
            <div className="flex-1">
              <Editor
                height="100%"
                language={getLanguage(selectedFile)}
                value={fileContent}
                onChange={handleEditorChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  formatOnPaste: true,
                  formatOnType: true,
                }}
                onMount={(editor) => {
                  editorRef.current = editor;
                  // Keyboard shortcut for save
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                    handleSave();
                  });
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <Code className="w-16 h-16 mx-auto mb-4 text-slate-700" />
              <p className="text-lg mb-2">No file selected</p>
              <p className="text-sm">Select a file from the tree to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
