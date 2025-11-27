'use client';

import { useState, useEffect } from 'react';
import FileEditor from './FileEditor';
import Modal from './Modal';

interface FileEntry {
  name: string;
  type: 'd' | '-';
  size: number;
  modifyTime: number;
  permissions: string;
}

interface FileExplorerProps {
  hostId: number;
}

function FileTreeItem({ 
  hostId, 
  name, 
  path, 
  onSelect, 
  onFileSelect,
  selectedPath,
  depth = 0,
  type = 'd'
}: { 
  hostId: number; 
  name: string; 
  path: string; 
  onSelect: (path: string) => void; 
  onFileSelect: (path: string) => void;
  selectedPath: string;
  depth?: number;
  type?: 'd' | '-';
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const isSelected = path === selectedPath;
  const paddingLeft = `${depth * 12 + 4}px`;

  // Auto-expand if this folder is an ancestor of the selected path
  useEffect(() => {
    if (type === 'd' && selectedPath.startsWith(path) && selectedPath !== path) {
      // Check if it's a direct ancestor (to avoid false positives like /usr matching /usr_local)
      // If path is '/', it matches everything starting with '/'
      // If path is '/foo', it matches '/foo/bar' but not '/foobar'
      const isAncestor = path === '/' || selectedPath.startsWith(path + '/');
      
      if (isAncestor && !isExpanded) {
        setIsExpanded(true);
      }
    }
  }, [selectedPath, path, type, isExpanded]);

  // Fetch children when expanded
  useEffect(() => {
    if (isExpanded && !hasLoaded && !loading) {
      const loadChildren = async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/hosts/${hostId}/files/list?path=${encodeURIComponent(path)}`);
          if (res.ok) {
            const data = await res.json();
            setChildren(data.files);
            setHasLoaded(true);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      loadChildren();
    }
  }, [isExpanded, hasLoaded, loading, hostId, path]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (type !== 'd') return;
    setIsExpanded(!isExpanded);
  };

  const handleClick = () => {
    if (type === 'd') {
      onSelect(path);
    } else {
      onFileSelect(path);
    }
  };

  return (
    <div>
      <div 
        className={`
          flex items-center gap-1 py-1 pr-2 cursor-pointer select-none text-sm font-mono
          ${isSelected ? 'bg-cyan-900/30 text-cyan-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}
        `}
        style={{ paddingLeft }}
        onClick={handleClick}
      >
        {type === 'd' ? (
          <button 
            onClick={handleToggle}
            className="p-0.5 hover:bg-gray-700 rounded text-gray-500"
          >
            {loading ? (
              <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg 
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        ) : (
          <span className="w-4" /> // Spacer for alignment
        )}
        
        {type === 'd' ? (
          <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        <span className="truncate">{name}</span>
      </div>
      
      {isExpanded && (
        <div>
          {children.map((child) => (
            <FileTreeItem
              key={child.name}
              hostId={hostId}
              name={child.name}
              path={path === '/' ? `/${child.name}` : `${path}/${child.name}`}
              onSelect={onSelect}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
              depth={depth + 1}
              type={child.type}
            />
          ))}
          {children.length === 0 && hasLoaded && (
            <div className="text-xs text-gray-600 py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 20}px` }}>
              (empty)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer({ hostId }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  
  // New state for creation
  const [createModal, setCreateModal] = useState<{ type: 'file' | 'folder', isOpen: boolean }>({ type: 'file', isOpen: false });
  const [newItemName, setNewItemName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchFiles = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hosts/${hostId}/files/list?path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch files');
      }
      const data = await res.json();
      setFiles(data.files);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(currentPath);
  }, [hostId, currentPath]);

  const handleNavigate = (name: string) => {
    const newPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    setCurrentPath(newPath);
  };

  const handleUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/');
    parts.pop();
    const newPath = parts.join('/') || '/';
    setCurrentPath(newPath);
  };

  const handleFileClick = (file: FileEntry) => {
    if (file.type === 'd') {
      handleNavigate(file.name);
    } else {
      const filePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      setEditingFile(filePath);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;
    setCreating(true);
    setError(null);
    try {
        const cleanName = newItemName.replace(/^\//, '');
        const path = currentPath === '/' ? `/${cleanName}` : `${currentPath}/${cleanName}`;
        
        if (createModal.type === 'folder') {
            const res = await fetch(`/api/hosts/${hostId}/files/mkdir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create folder');
            }
        } else {
            const res = await fetch(`/api/hosts/${hostId}/files/content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, content: '' }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create file');
            }
            setEditingFile(path);
        }
        
        setCreateModal({ ...createModal, isOpen: false });
        setNewItemName('');
        fetchFiles(currentPath);
    } catch (err: any) {
        setError(err.message);
    } finally {
        setCreating(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (editingFile) {
    return (
      <FileEditor
        hostId={hostId}
        path={editingFile}
        onClose={() => {
          setEditingFile(null);
          fetchFiles(currentPath);
        }}
      />
    );
  }

  return (
    <div className="bg-[#0b101b] rounded border border-gray-800 overflow-hidden flex h-full relative">
      {/* Sidebar - File Tree */}
      <div className="w-64 border-r border-gray-800 flex flex-col bg-[#05080f]">
        <div className="p-3 border-b border-gray-800 text-xs font-bold text-gray-500 uppercase tracking-wider">
          Explorer
        </div>
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          <FileTreeItem
            hostId={hostId}
            name="/"
            path="/"
            onSelect={setCurrentPath}
            onFileSelect={setEditingFile}
            selectedPath={currentPath}
          />
        </div>
      </div>

      {/* Main Content - File List */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header / Breadcrumbs */}
        <div className="p-4 border-b border-gray-800 flex items-center gap-4 bg-[#05080f]">
          <button
            onClick={handleUp}
            disabled={currentPath === '/'}
            className="p-1 hover:bg-gray-800 rounded disabled:opacity-30 disabled:cursor-not-allowed text-cyan-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
          <div className="font-mono text-sm text-gray-300 truncate flex-1">
            {currentPath}
          </div>
          
          <div className="flex items-center gap-2">
            <button
                onClick={() => {
                    setNewItemName('');
                    setCreateModal({ type: 'file', isOpen: true });
                }}
                className="p-1.5 hover:bg-gray-800 rounded text-cyan-400 flex items-center gap-1 text-xs border border-transparent hover:border-gray-700"
                title="New File"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                New File
            </button>
            <button
                onClick={() => {
                    setNewItemName('');
                    setCreateModal({ type: 'folder', isOpen: true });
                }}
                className="p-1.5 hover:bg-gray-800 rounded text-cyan-400 flex items-center gap-1 text-xs border border-transparent hover:border-gray-700"
                title="New Folder"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                New Folder
            </button>
            <div className="w-px h-4 bg-gray-700 mx-1"></div>
            <button
                onClick={() => fetchFiles(currentPath)}
                className="p-1 hover:bg-gray-800 rounded text-cyan-400"
                title="Refresh"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-cyan-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            </div>
          ) : error ? (
            <div className="p-4 text-red-400 text-center">
              {error}
              <div className="mt-2">
                <button onClick={() => fetchFiles(currentPath)} className="text-sm underline">Retry</button>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#05080f] text-gray-500 font-mono text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium w-24">Size</th>
                  <th className="p-3 font-medium w-32">Permissions</th>
                  <th className="p-3 font-medium w-48">Modified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {files.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">Empty directory</td>
                  </tr>
                )}
                {files.map((file) => (
                  <tr
                    key={file.name}
                    onClick={() => handleFileClick(file)}
                    className="hover:bg-cyan-900/10 cursor-pointer transition-colors group"
                  >
                    <td className="p-3 flex items-center gap-2 text-gray-300 group-hover:text-cyan-400">
                      {file.type === 'd' ? (
                        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      <span className="truncate">{file.name}</span>
                    </td>
                    <td className="p-3 font-mono text-gray-500">{file.type === 'd' ? '-' : formatSize(file.size)}</td>
                    <td className="p-3 font-mono text-gray-500">{file.permissions}</td>
                    <td className="p-3 font-mono text-gray-500">{formatDate(file.modifyTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        isOpen={createModal.isOpen}
        onClose={() => setCreateModal({ ...createModal, isOpen: false })}
        title={`Create New ${createModal.type === 'file' ? 'File' : 'Folder'}`}
      >
        <form onSubmit={handleCreate} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                    Name
                </label>
                <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full bg-[#0b101b] border border-gray-700 rounded p-2 text-gray-200 focus:border-cyan-500 focus:outline-none"
                    placeholder={createModal.type === 'file' ? 'example.txt' : 'folder_name'}
                    autoFocus
                />
            </div>
            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={() => setCreateModal({ ...createModal, isOpen: false })}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={creating || !newItemName}
                    className="px-4 py-2 text-sm bg-cyan-600 text-white rounded hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {creating ? 'Creating...' : 'Create'}
                </button>
            </div>
        </form>
      </Modal>
    </div>
  );
}
