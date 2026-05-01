import { useState, useCallback, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { 
  FilePlus, 
  FolderOpen, 
  Download, 
  Save, 
  Code2, 
  Trash2, 
  Sun, 
  Moon,
  FileCode2,
  FileJson,
  Terminal,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import type { FileType, ConsoleLog, Toast } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useCodeEditor } from '../hooks/useCodeEditor';
import { exportProject } from '../utils/export';
import './App.css';

function App() {
  const { theme, toggleTheme, isDark } = useTheme();
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
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

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

  const handleCodeChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      updateCode(activeFile, value);
    }
  }, [activeFile, updateCode]);

  const handleNew = useCallback(() => {
    if (window.confirm('Create new project? Unsaved changes will be lost.')) {
      newProject();
      showToast('New project created', 'success');
    }
  }, [newProject, showToast]);

  const handleOpen = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSave = useCallback(() => {
    showToast('Project saved', 'success');
  }, [showToast]);

  const handleExport = useCallback(async () => {
    try {
      setLoading(true);
      const msg = await exportProject(html, css, js);
      showToast(msg, 'success');
    } catch (error) {
      showToast('Export failed', 'error');
    } finally {
      setLoading(false);
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
        showToast(`Loaded ${file.name}`, 'success');
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  }, [updateCode, showToast]);

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
          handleNew();
        } else if (e.key === 'e') {
          e.preventDefault();
          handleExport();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleNew, handleExport]);

  const currentCode = activeFile === 'html' ? html : activeFile === 'css' ? css : js;
  const language = activeFile === 'html' ? 'html' : activeFile === 'css' ? 'css' : 'javascript';

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
              args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))
            }, '*');
          }

          console.log = function() { sendToParent('log', arguments); originalLog.apply(console, arguments); };
          console.info = function() { sendToParent('info', arguments); originalInfo.apply(console, arguments); };
          console.warn = function() { sendToParent('warn', arguments); originalWarn.apply(console, arguments); };
          console.error = function() { sendToParent('error', arguments); originalError.apply(console, arguments); };

          window.onerror = function(msg, url, line) {
            sendToParent('error', [msg + ' (line ' + line + ')']);
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

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(previewContent);
    doc.close();
  }, [previewContent]);

  return (
    <>
      {/* Toolbar */}
      <header className="toolbar">
        <div className="toolbar-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 8h10M7 12h6M7 16h8" />
          </svg>
          <span>Code Studio</span>
        </div>

        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={handleNew} title="New Project (Ctrl+N)">
            <FilePlus size={16} />
            New
          </button>
          <button className="toolbar-btn" onClick={handleOpen} title="Open Files">
            <FolderOpen size={16} />
            Open
          </button>
          <button className="toolbar-btn" onClick={handleSave} title="Save (Ctrl+S)">
            <Save size={16} />
            Save
          </button>
        </div>

        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={handleExport} title="Export (Ctrl+E)">
            <Download size={16} />
            Export
          </button>
        </div>

        <div className="spacer" />

        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={handleFormat} title="Format Code">
            <Code2 size={16} />
            Format
          </button>
          <button className="toolbar-btn" onClick={handleClear} title="Clear Console">
            <Trash2 size={16} />
            Clear
          </button>
        </div>

        <button 
          className="toolbar-btn theme-toggle-btn" 
          onClick={toggleTheme}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* Editor Tabs */}
      <div className="editor-tabs">
        <button
          className={`editor-tab ${activeFile === 'html' ? 'active' : ''}`}
          onClick={() => setActiveFile('html')}
        >
          <FileCode2 size={14} />
          index.html
        </button>
        <button
          className={`editor-tab ${activeFile === 'css' ? 'active' : ''}`}
          onClick={() => setActiveFile('css')}
        >
          <FileCode2 size={14} />
          styles.css
        </button>
        <button
          className={`editor-tab ${activeFile === 'js' ? 'active' : ''}`}
          onClick={() => setActiveFile('js')}
        >
          <FileJson size={14} />
          script.js
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="editor-area">
          <div className="editor-wrapper">
            <Editor
              height="100%"
              language={language}
              value={currentCode}
              theme={isDark ? 'vs-dark' : 'vs'}
              onMount={handleEditorMount}
              onChange={handleCodeChange}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                lineNumbers: 'on',
                roundedSelection: true,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                padding: { top: 10 },
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8
                }
              }}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="preview">
          <div className="preview-header">
            <div className="preview-title">
              <RefreshCw size={14} />
              Live Preview
            </div>
            <div className="preview-url">localhost:preview</div>
          </div>
          <iframe 
            ref={iframeRef}
            className="preview-frame"
            title="Preview"
            sandbox="allow-scripts"
          />
        </div>

        {/* Console */}
        <div className="console">
          <div className="console-header">
            <button className="console-title-btn">
              <Terminal size={14} />
              Console
            </button>
            <button className="console-btn" onClick={handleClear}>
              <Trash2 size={14} />
            </button>
          </div>
          <div className="console-body">
            {consoleLogs.length === 0 ? (
              <div className="console-empty">
                <Terminal size={16} />
                Console ready. Type JavaScript to see output.
              </div>
            ) : (
              consoleLogs.map(log => (
                <div key={log.id} className={`console-log ${log.type}`}>
                  <span className="console-time">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="console-message">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <footer className="statusbar">
        <div className="statusbar-left">
          <span className="status-item">
            <CheckCircle size={12} />
            Ready
          </span>
        </div>
        <div className="statusbar-right">
          <span className="status-item">Ln {cursorPos.line}, Col {cursorPos.column}</span>
          <span className="status-item">{activeFile.toUpperCase()}</span>
          <span className="status-item">UTF-8</span>
        </div>
      </footer>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".html,.css,.js"
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
            {toast.type === 'success' && <CheckCircle size={18} />}
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.type === 'info' && <CheckCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default App;