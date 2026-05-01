import { useState, useCallback, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import {
  Files,
  Search,
  GitBranch,
  Play,
  Bell,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  X,
  Terminal,
  AlertCircle,
  CheckCircle,
  Code2,
  Trash2,
  Download,
  FilePlus,
  FolderPlus,
  FolderOpen,
  Save,
  RefreshCw,
  MoreHorizontal,
  SplitSquareHorizontal,
  Github,
  Linkedin,
  Mail,
  Globe,
  Maximize2,
  Minus,
  ExternalLink
} from 'lucide-react';

const InstagramIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const CodepenIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l9 5v10l-9 5-9-5V7l9-5z" />
    <path d="M12 22V12" />
    <path d="M3 7l9 5 9-5" />
  </svg>
);
import type { ConsoleLog, Toast } from './types';
import { useTheme } from './hooks/useTheme';
import { useCodeEditor } from './hooks/useCodeEditor';
import { exportProject } from './utils/export';
import './App.css';

type CoreFileKey = 'html' | 'css' | 'js';
type FileKey = string;

interface UserFile {
  key: string;
  name: string;
  language: string;
  content: string;
}

const CORE_FILE_META: Record<CoreFileKey, { name: string; color: string; label: string }> = {
  html: { name: 'index.html', color: '#e34c26', label: '<>' },
  css: { name: 'styles.css', color: '#264de4', label: '#' },
  js: { name: 'script.js', color: '#f7df1e', label: 'JS' }
};

const EXT_META: Record<string, { color: string; label: string; lang: string }> = {
  html: { color: '#e34c26', label: '<>', lang: 'html' },
  htm: { color: '#e34c26', label: '<>', lang: 'html' },
  css: { color: '#264de4', label: '#', lang: 'css' },
  scss: { color: '#cd6799', label: '#', lang: 'scss' },
  js: { color: '#f7df1e', label: 'JS', lang: 'javascript' },
  jsx: { color: '#61dafb', label: 'JX', lang: 'javascript' },
  ts: { color: '#3178c6', label: 'TS', lang: 'typescript' },
  tsx: { color: '#3178c6', label: 'TX', lang: 'typescript' },
  json: { color: '#cbcb41', label: '{}', lang: 'json' },
  md: { color: '#519aba', label: 'M↓', lang: 'markdown' },
  txt: { color: '#888888', label: 'T', lang: 'plaintext' }
};

function getExtMeta(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_META[ext] ?? { color: '#888', label: ext.slice(0, 2).toUpperCase() || '?', lang: 'plaintext' };
}

function FileBadge({ name }: { name: string }) {
  const meta = getExtMeta(name);
  return (
    <span className="file-icon" style={{ background: meta.color }}>
      {meta.label}
    </span>
  );
}

function App() {
  const {  } = useTheme();
  const {
    html,
    css,
    js,
    activeFile,
    consoleLogs,
    setActiveFile,
    updateCode,
    newProject,
    addConsoleLog,
    clearConsole
  } = useCodeEditor();

  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [openTabs, setOpenTabs] = useState<FileKey[]>(['html', 'css', 'js']);
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [folderOpen, setFolderOpen] = useState(true);
  const [bottomPanel, setBottomPanel] = useState<'console' | 'preview' | 'problems'>('console');
  const [activitySection, setActivitySection] = useState<'explorer' | 'search' | 'git' | 'run' | 'extensions'>('explorer');
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);

  // Resize / panel state
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [editorFlex, setEditorFlex] = useState(0.55); // 0..1 fraction for editor pane width
  const [bottomHeight, setBottomHeight] = useState(220);
  const [panelMaximized, setPanelMaximized] = useState(false);
  const [panelMinimized, setPanelMinimized] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const mainAreaRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const handleEditorMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, column: e.position.column });
    });
  }, []);

  const isCoreKey = (k: string): k is CoreFileKey => k === 'html' || k === 'css' || k === 'js';

  const getFileInfo = (key: FileKey): { name: string; language: string; content: string } => {
    if (isCoreKey(key)) {
      const content = key === 'html' ? html : key === 'css' ? css : js;
      return { name: CORE_FILE_META[key].name, language: getExtMeta(CORE_FILE_META[key].name).lang, content };
    }
    const f = userFiles.find(f => f.key === key);
    if (!f) return { name: 'untitled', language: 'plaintext', content: '' };
    return { name: f.name, language: f.language, content: f.content };
  };

  const handleCodeChange = useCallback((value: string | undefined) => {
    if (value === undefined) return;
    if (isCoreKey(activeFile)) {
      updateCode(activeFile, value);
    } else {
      setUserFiles(prev => prev.map(f => f.key === activeFile ? { ...f, content: value } : f));
    }
  }, [activeFile, updateCode]);

  const handleNew = useCallback(() => {
    if (window.confirm('Create new project? Unsaved changes will be lost.')) {
      newProject();
      setUserFiles([]);
      setOpenTabs(['html', 'css', 'js']);
      showToast('New project created', 'success');
    }
  }, [newProject, showToast]);

  const handleNewFile = useCallback(() => {
    const name = window.prompt('Enter file name (e.g. about.html, utils.js):');
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!/\.[a-z0-9]+$/i.test(trimmed)) {
      showToast('File must have an extension', 'error');
      return;
    }
    const exists =
      Object.values(CORE_FILE_META).some(m => m.name.toLowerCase() === trimmed.toLowerCase()) ||
      userFiles.some(f => f.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showToast(`${trimmed} already exists`, 'error');
      return;
    }
    const meta = getExtMeta(trimmed);
    const key = `user_${Date.now()}_${trimmed}`;
    const file: UserFile = { key, name: trimmed, language: meta.lang, content: '' };
    setUserFiles(prev => [...prev, file]);
    setOpenTabs(prev => [...prev, key]);
    setActiveFile(key as CoreFileKey);
    showToast(`Created ${trimmed}`, 'success');
  }, [userFiles, setActiveFile, showToast]);

  const handleOpen = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSave = useCallback(() => {
    showToast('Project saved', 'success');
  }, [showToast]);

  const handleExport = useCallback(async () => {
    try {
      const msg = await exportProject(html, css, js);
      showToast(msg, 'success');
    } catch {
      showToast('Export failed', 'error');
    }
  }, [html, css, js, showToast]);

  const handleFormat = useCallback(() => {
    editorRef.current?.getAction('editor.action.formatDocument')?.run();
    showToast('Code formatted', 'success');
  }, [showToast]);

  const handleClear = useCallback(() => {
    clearConsole();
    showToast('Console cleared', 'info');
  }, [clearConsole, showToast]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'html') updateCode('html', content);
        else if (ext === 'css') updateCode('css', content);
        else if (ext === 'js') updateCode('js', content);
        else {
          const meta = getExtMeta(file.name);
          const key = `user_${Date.now()}_${file.name}`;
          setUserFiles(prev => [...prev, { key, name: file.name, language: meta.lang, content }]);
          setOpenTabs(prev => [...prev, key]);
        }
        showToast(`Loaded ${file.name}`, 'success');
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  }, [updateCode, showToast]);

  const openFile = (key: FileKey) => {
    if (!openTabs.includes(key)) setOpenTabs(prev => [...prev, key]);
    setActiveFile(key as CoreFileKey);
  };

  const closeTab = (e: React.MouseEvent, key: FileKey) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(t => t !== key);
    setOpenTabs(newTabs);
    if (activeFile === key && newTabs.length > 0) {
      setActiveFile(newTabs[newTabs.length - 1] as CoreFileKey);
    }
  };

  const deleteUserFile = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    const file = userFiles.find(f => f.key === key);
    if (!file) return;
    if (!window.confirm(`Delete ${file.name}?`)) return;
    setUserFiles(prev => prev.filter(f => f.key !== key));
    setOpenTabs(prev => prev.filter(t => t !== key));
    if (activeFile === key) setActiveFile('html');
    showToast(`Deleted ${file.name}`, 'info');
  };

  // ----- Resize handlers -----
  const startSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      const w = Math.min(500, Math.max(160, startW + (ev.clientX - startX)));
      setSidebarWidth(w);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startEditorResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = editorContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => {
      const f = (ev.clientX - rect.left) / rect.width;
      setEditorFlex(Math.min(0.9, Math.max(0.1, f)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startBottomResize = (e: React.MouseEvent) => {
    e.preventDefault();
    if (panelMinimized || panelMaximized) return;
    const startY = e.clientY;
    const startH = bottomHeight;
    const main = mainAreaRef.current;
    const maxH = main ? main.clientHeight - 120 : 600;
    const onMove = (ev: MouseEvent) => {
      const h = Math.min(maxH, Math.max(80, startH - (ev.clientY - startY)));
      setBottomHeight(h);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'row-resize';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const togglePanelMaximize = () => {
    setPanelMinimized(false);
    setPanelMaximized(p => !p);
  };

  const togglePanelMinimize = () => {
    if (panelMinimized) {
      setPanelMinimized(false);
    } else {
      setPanelMaximized(false);
      setPanelMinimized(true);
    }
  };

  const closePanel = () => {
    setPanelMinimized(true);
    setPanelMaximized(false);
  };

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'console') {
        addConsoleLog(e.data.method as ConsoleLog['type'], e.data.args.join(' '));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [addConsoleLog]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'n') {
          e.preventDefault();
          handleNewFile();
        } else if (e.key === 'e') {
          e.preventDefault();
          handleExport();
        } else if (e.key === 'b') {
          e.preventDefault();
          setExplorerOpen(prev => !prev);
        } else if (e.key === 'j') {
          e.preventDefault();
          togglePanelMinimize();
        } else if (e.key === '`') {
          e.preventDefault();
          setBottomPanel('console');
          setPanelMinimized(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleNewFile, handleExport, panelMinimized]);

  const currentInfo = getFileInfo(activeFile);
  const currentCode = currentInfo.content;
  const language = currentInfo.language;
  const currentName = currentInfo.name;

  const previewContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>${css}</style>
    </head>
    <body>
      ${html}
      <script>
        (function() {
          const originalLog = console.log;
          const originalInfo = console.info;
          const originalWarn = console.warn;
          const originalError = console.error;

          function sendToParent(type, args) {
            window.parent.postMessage({
              type: 'console',
              method: type,
              args: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))
            }, '*');
          }

          console.log = function() { sendToParent('log', arguments); originalLog.apply(console, arguments); };
          console.info = function() { sendToParent('info', arguments); originalInfo.apply(console, arguments); };
          console.warn = function() { sendToParent('warn', arguments); originalWarn.apply(console, arguments); };
          console.error = function() { sendToParent('error', arguments); originalError.apply(console, arguments); };

          window.onerror = function(msg) {
            sendToParent('error', [msg]);
          };
        })();

        try {
          ${js}
        } catch(e) {
          console.error(e.message);
        }
      <\/script>
    </body>
    </html>
  `;

  const updatePreview = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(previewContent);
      doc.close();
    }
  }, [previewContent]);

  useEffect(() => {
    const timer = setTimeout(() => updatePreview(), 100);
    return () => clearTimeout(timer);
  }, [updatePreview]);

  const renderTabName = (key: FileKey) => {
    if (isCoreKey(key)) return CORE_FILE_META[key].name;
    return userFiles.find(f => f.key === key)?.name ?? 'untitled';
  };

  // Bottom panel sizing
  const panelHeightStyle: React.CSSProperties = panelMinimized
    ? { height: 35, minHeight: 35, resize: 'none' }
    : panelMaximized
      ? { flex: 1, height: 'auto', minHeight: 0, maxHeight: 'none', resize: 'none' }
      : { height: bottomHeight, minHeight: 80, resize: 'none' };

  return (
    <div className="vscode-shell">
      {/* Title Bar */}
      <header className="title-bar">
        <div className="title-bar-left">
          <div className="window-logo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#0098FF">
              <path d="M16.5 2.5l-13 9 4 3 12-11.5-3-.5zm0 19l-9-7 4-3 8 9-3 1z"/>
            </svg>
          </div>
          <nav className="menu-bar">
            <button className="menu-item">File</button>
            <button className="menu-item">Edit</button>
            <button className="menu-item">Selection</button>
            <button className="menu-item">View</button>
            <button className="menu-item">Go</button>
            <button className="menu-item">Run</button>
            <button className="menu-item">Terminal</button>
            <button className="menu-item">Help</button>
          </nav>
        </div>
        <div className="title-bar-center">
          <span className="search-bar-mini">
            <Search size={12} />
            Code Studio — Web Playground
          </span>
        </div>
        <div className="title-bar-right">
          <button className="window-btn" title="Minimize">─</button>
          <button className="window-btn" title="Maximize"><Maximize2 size={10} /></button>
          <button className="window-btn close" title="Close"><X size={12} /></button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="vscode-body" ref={mainAreaRef}>
        {/* Activity Bar */}
<aside className="activity-bar">
          <div className="activity-top">
            <button
              className={`activity-btn ${activitySection === 'explorer' ? 'active' : ''}`}
              onClick={() => { setActivitySection('explorer'); setExplorerOpen(true); }}
              title="Explorer (Ctrl+Shift+E)"
            >
              <Files size={22} />
            </button>
            <button
              className={`activity-btn ${activitySection === 'search' ? 'active' : ''}`}
              onClick={() => { setActivitySection('search'); setExplorerOpen(false); }}
              title="Search (Ctrl+Shift+F)"
            >
              <Search size={22} />
            </button>
            <button
              className={`activity-btn ${activitySection === 'git' ? 'active' : ''}`}
              onClick={() => { setActivitySection('git'); setExplorerOpen(false); }}
              title="Source Control (Ctrl+Shift+G)"
            >
              <GitBranch size={22} />
            </button>
            <button
              className={`activity-btn ${activitySection === 'run' ? 'active' : ''}`}
              onClick={() => { setActivitySection('run'); setExplorerOpen(false); }}
              title="Run and Debug (Ctrl+Shift+D)"
            >
              <Play size={22} />
            </button>
            <button
              className={`activity-btn ${activitySection === 'extensions' ? 'active' : ''}`}
              onClick={() => { setActivitySection('extensions'); setExplorerOpen(false); }}
              title="Extensions (Ctrl+Shift+X)"
            >
              <SplitSquareHorizontal size={22} />
            </button>
          </div>
          <div className="activity-bottom">
            <button
              className="activity-btn"
              onClick={() => window.open('https://github.com/girishlade111', '_blank')}
              title="GitHub"
            >
              <Github size={22} />
            </button>
            <button
              className="activity-btn"
              onClick={() => window.open('https://www.linkedin.com/in/girish-lade-075bba201/', '_blank')}
              title="LinkedIn"
            >
              <Linkedin size={22} />
            </button>
            <button
              className="activity-btn"
              onClick={() => window.open('https://www.instagram.com/girish_lade_/', '_blank')}
              title="Instagram"
            >
              <InstagramIcon size={22} />
            </button>
            <button
              className="activity-btn"
              onClick={() => window.open('https://codepen.io/Girish-Lade-the-looper', '_blank')}
              title="CodePen"
            >
              <CodepenIcon size={22} />
            </button>
            <button
              className="activity-btn"
              onClick={() => window.location.href = 'mailto:admin@ladestack.in'}
              title="Email"
            >
              <Mail size={22} />
            </button>
            <button
              className="activity-btn"
              onClick={() => window.open('https://ladestack.in', '_blank')}
              title="Website"
            >
              <Globe size={22} />
            </button>
          </div>
        </aside>

        {/* Side Bar (Explorer) */}
        {explorerOpen && (
          <>
            <aside className="side-bar" style={{ width: sidebarWidth }}>
              <div className="side-bar-header">
                <span>Explorer</span>
                <div className="side-bar-actions">
                  <button className="icon-btn" title="New File (Ctrl+N)" onClick={handleNewFile}>
                    <FilePlus size={14} />
                  </button>
                  <button className="icon-btn" title="New Folder">
                    <FolderPlus size={14} />
                  </button>
                  <button className="icon-btn" title="Open File" onClick={handleOpen}>
                    <FolderOpen size={14} />
                  </button>
                  <button className="icon-btn" title="Refresh / New Project" onClick={handleNew}>
                    <RefreshCw size={14} />
                  </button>
                  <button className="icon-btn" title="More Actions">
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </div>

              <div className="explorer-section">
                <button
                  className="folder-row"
                  onClick={() => setFolderOpen(o => !o)}
                >
                  {folderOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="folder-name">CODE-STUDIO</span>
                </button>

                {folderOpen && (
                  <div className="folder-children">
                    {(Object.keys(CORE_FILE_META) as CoreFileKey[]).map(key => (
                      <button
                        key={key}
                        className={`file-row ${activeFile === key ? 'active' : ''}`}
                        onClick={() => openFile(key)}
                      >
                        <FileBadge name={CORE_FILE_META[key].name} />
                        <span className="file-name">{CORE_FILE_META[key].name}</span>
                      </button>
                    ))}
                    {userFiles.map(f => (
                      <button
                        key={f.key}
                        className={`file-row ${activeFile === f.key ? 'active' : ''}`}
                        onClick={() => openFile(f.key)}
                      >
                        <FileBadge name={f.name} />
                        <span className="file-name">{f.name}</span>
                        <span
                          className="file-delete"
                          onClick={(e) => deleteUserFile(e, f.key)}
                          title="Delete"
                        >
                          <X size={12} />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="explorer-section outline">
                <button className="folder-row">
                  <ChevronRight size={14} />
                  <span className="folder-name">OUTLINE</span>
                </button>
              </div>
              <div className="explorer-section outline">
                <button className="folder-row">
                  <ChevronRight size={14} />
                  <span className="folder-name">TIMELINE</span>
                </button>
              </div>
            </aside>
            <div className="resizer-v" onMouseDown={startSidebarResize} />
          </>
        )}

        {/* Editor + Panel Group */}
        <main className="editor-group">
          {/* Tab Bar */}
          <div className="tab-bar">
            <div className="tabs">
              {openTabs.map(key => (
                <button
                  key={key}
                  className={`tab ${activeFile === key ? 'active' : ''}`}
                  onClick={() => setActiveFile(key as CoreFileKey)}
                >
                  <FileBadge name={renderTabName(key)} />
                  <span className="tab-name">{renderTabName(key)}</span>
                  <span
                    className="tab-close"
                    onClick={(e) => closeTab(e, key)}
                  >
                    <X size={14} />
                  </span>
                </button>
              ))}
            </div>
            <div className="tab-actions">
              <button className="icon-btn" onClick={handleNewFile} title="New File (Ctrl+N)">
                <FilePlus size={16} />
              </button>
              <button className="icon-btn" onClick={handleFormat} title="Format Code">
                <Code2 size={16} />
              </button>
              <button className="icon-btn" onClick={updatePreview} title="Refresh Preview">
                <RefreshCw size={16} />
              </button>
              <button className="icon-btn" onClick={handleSave} title="Save (Ctrl+S)">
                <Save size={16} />
              </button>
              <button className="icon-btn" onClick={handleExport} title="Export (Ctrl+E)">
                <Download size={16} />
              </button>
              <button className="icon-btn" title="Split Editor">
                <SplitSquareHorizontal size={16} />
              </button>
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="breadcrumbs">
            <span className="crumb">code-studio</span>
            <ChevronRight size={12} />
            <span className="crumb">
              <FileBadge name={currentName} />
              {currentName}
            </span>
          </div>

          {/* Editor + Preview area */}
          {!panelMaximized && (
            <div
              className="editor-container"
              ref={editorContainerRef}
              style={{ flex: panelMinimized ? 1 : `1 1 auto` }}
            >
              <div className="editor-pane" style={{ flex: `${editorFlex} 1 0` }}>
                <Editor
                  height="100%"
                  language={language}
                  path={currentName}
                  value={currentCode}
                  theme={isDark ? 'vs-dark' : 'vs'}
                  onMount={handleEditorMount}
                  onChange={handleCodeChange}
                  options={{
                    fontSize: 13,
                    fontFamily: "'Cascadia Code', 'Consolas', 'Courier New', monospace",
                    fontLigatures: true,
                    minimap: { enabled: true, scale: 1 },
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: true,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'off',
                    padding: { top: 8 },
                    renderLineHighlight: 'all',
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    bracketPairColorization: { enabled: true },
                    guides: { indentation: true, bracketPairs: true },
                    scrollbar: {
                      verticalScrollbarSize: 14,
                      horizontalScrollbarSize: 14
                    }
                  }}
                />
              </div>

              <div className="resizer-v" onMouseDown={startEditorResize} />

              <div className="preview-pane" style={{ flex: `${1 - editorFlex} 1 0` }}>
                <div className="pane-header">
                  <span className="pane-title">PREVIEW</span>
                  <button className="icon-btn" onClick={updatePreview} title="Reload">
                    <RefreshCw size={14} />
                  </button>
                </div>
                <iframe
                  ref={iframeRef}
                  className="preview-frame"
                  title="Preview"
                  sandbox="allow-scripts"
                />
              </div>
            </div>
          )}

          {/* Bottom Panel resize handle */}
          {!panelMinimized && !panelMaximized && (
            <div className="resizer-h" onMouseDown={startBottomResize} />
          )}

          {/* Bottom Panel */}
          <div
            className={`bottom-panel ${panelMinimized ? 'minimized' : ''} ${panelMaximized ? 'maximized' : ''}`}
            style={panelHeightStyle}
          >
            <div className="panel-tabs">
              <button
                className={`panel-tab ${bottomPanel === 'problems' ? 'active' : ''}`}
                onClick={() => { setBottomPanel('problems'); setPanelMinimized(false); }}
              >
                PROBLEMS <span className="badge">0</span>
              </button>
              <button
                className={`panel-tab ${bottomPanel === 'console' ? 'active' : ''}`}
                onClick={() => { setBottomPanel('console'); setPanelMinimized(false); }}
              >
                OUTPUT
              </button>
              <button
                className={`panel-tab ${bottomPanel === 'preview' ? 'active' : ''}`}
                onClick={() => { setBottomPanel('preview'); setPanelMinimized(false); }}
              >
                DEBUG CONSOLE
              </button>
              <button className="panel-tab">
                TERMINAL
              </button>
              <div className="panel-spacer" />
              <button className="icon-btn" onClick={handleClear} title="Clear Output">
                <Trash2 size={14} />
              </button>
              <button
                className="icon-btn"
                onClick={togglePanelMaximize}
                title={panelMaximized ? 'Restore Panel Size' : 'Maximize Panel Size'}
              >
                {panelMaximized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
              <button
                className="icon-btn"
                onClick={togglePanelMinimize}
                title={panelMinimized ? 'Restore Panel' : 'Hide Panel'}
              >
                <Minus size={14} />
              </button>
              <button className="icon-btn" onClick={closePanel} title="Close Panel">
                <X size={14} />
              </button>
            </div>
            {!panelMinimized && (
              <div className="panel-body">
                {consoleLogs.length === 0 ? (
                  <div className="console-empty">
                    <Terminal size={14} />
                    <span>&gt; Console ready. Run code to see output.</span>
                  </div>
                ) : (
                  consoleLogs.map((log) => (
                    <div key={log.id} className={`console-line ${log.type}`}>
                      <span className="console-prefix">
                        {log.type === 'error' ? '✖' : log.type === 'warn' ? '⚠' : '›'}
                      </span>
                      <span className="console-message">{log.message}</span>
                      <span className="console-time">{log.timestamp.toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Status Bar */}
      <footer className="status-bar">
        <div className="status-left">
          <span className="status-item highlight">
            <GitBranch size={12} />
            main
          </span>
          <span className="status-item">
            <RefreshCw size={12} /> 0 ↓ 0 ↑
          </span>
          <span className="status-item">
            <AlertCircle size={12} /> 0
          </span>
          <span className="status-item">
            <CheckCircle size={12} /> 0
          </span>
        </div>
        <div className="status-right">
          <span className="status-item">Ln {cursorPos.line}, Col {cursorPos.column}</span>
          <span className="status-item">Spaces: 2</span>
          <span className="status-item">UTF-8</span>
          <span className="status-item">LF</span>
          <span className="status-item">{language === 'javascript' ? 'JavaScript' : language === 'typescript' ? 'TypeScript' : language.toUpperCase()}</span>
          <span className="status-item">
            <Bell size={12} />
          </span>
        </div>
      </footer>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
      />

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast ${toast.type}`}
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          >
            {toast.type === 'success' && <CheckCircle size={16} />}
            {toast.type === 'error' && <AlertCircle size={16} />}
            {toast.type === 'info' && <Bell size={16} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
