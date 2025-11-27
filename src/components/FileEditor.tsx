'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface FileEditorProps {
  hostId: number;
  path: string;
  onClose: () => void;
}

const getLanguageFromPath = (path: string) => {
  const fileName = path.split('/').pop()?.toLowerCase() || '';
  
  // Specific filenames
  if (fileName === 'dockerfile') return 'dockerfile';
  if (fileName === 'makefile') return 'makefile'; // Monaco supports makefile
  if (fileName.startsWith('.env')) return 'ini';
  
  const ext = fileName.split('.').pop();
  
  // Handle files without extension (often shell scripts in Linux)
  if (fileName === ext && !fileName.startsWith('.')) {
    return 'shell';
  }

  switch (ext) {
    case 'js': return 'javascript';
    case 'ts': return 'typescript';
    case 'tsx': return 'typescript';
    case 'jsx': return 'javascript';
    case 'json': return 'json';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'md': return 'markdown';
    case 'py': return 'python';
    case 'sh': return 'shell';
    case 'bash': return 'shell';
    case 'zsh': return 'shell';
    case 'yml':
    case 'yaml': return 'yaml';
    case 'xml': return 'xml';
    case 'sql': return 'sql';
    case 'java': return 'java';
    case 'c': return 'c';
    case 'cpp': return 'cpp';
    case 'go': return 'go';
    case 'rs': return 'rust';
    case 'php': return 'php';
    case 'dockerfile': return 'dockerfile';
    case 'ini': return 'ini';
    case 'conf': return 'ini';
    case 'properties': return 'ini';
    case 'log': return 'plaintext';
    default: return 'plaintext';
  }
};

export default function FileEditor({ hostId, path, onClose }: FileEditorProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState(getLanguageFromPath(path));

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await fetch(`/api/hosts/${hostId}/files/content?path=${encodeURIComponent(path)}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch file content');
        }
        const data = await res.json();
        setContent(data.content);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (path) {
        fetchContent();
    }
  }, [hostId, path]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/hosts/${hostId}/files/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save file');
      }
      
      // Optional: Show success message
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditorWillMount = (monaco: any) => {
    monaco.editor.defineTheme('homon-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0b101b',
        'editor.foreground': '#e5e7eb',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': '#22d3ee',
        'editorCursor.foreground': '#22d3ee',
        'editor.selectionBackground': '#0891b240',
        'editor.lineHighlightBackground': '#164e6320',
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-cyan-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0b101b] text-gray-200 p-4 rounded border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-mono text-cyan-400 truncate">{path}</h3>
        <div className="flex gap-2 items-center">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-[#05080f] border border-gray-600 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
          >
            <option value="plaintext">Plain Text</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="json">JSON</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="markdown">Markdown</option>
            <option value="python">Python</option>
            <option value="shell">Shell</option>
            <option value="yaml">YAML</option>
            <option value="xml">XML</option>
            <option value="sql">SQL</option>
            <option value="java">Java</option>
            <option value="c">C</option>
            <option value="cpp">C++</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="php">PHP</option>
            <option value="dockerfile">Dockerfile</option>
            <option value="ini">INI</option>
          </select>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm border border-gray-600 rounded hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-sm bg-cyan-900/30 border border-cyan-500/50 text-cyan-400 rounded hover:bg-cyan-900/50 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 text-red-400 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 border border-gray-800 rounded overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={content}
          theme="homon-dark"
          beforeMount={handleEditorWillMount}
          onChange={(value) => setContent(value || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
          }}
        />
      </div>
    </div>
  );
}
