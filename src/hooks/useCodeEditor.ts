import { useState, useCallback, useEffect } from 'react';
import { FileType, ConsoleLog } from '../types';

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Project</title>
</head>
<body>
  <div class="container">
    <h1>Hello, World!</h1>
    <p>Start coding your project here.</p>
    <button id="btn">Click Me</button>
  </div>
</body>
</html>`;

const DEFAULT_CSS = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.container {
  text-align: center;
  color: #fff;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

p {
  font-size: 1.1rem;
  opacity: 0.9;
  margin-bottom: 1.5rem;
}

button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border: none;
  border-radius: 8px;
  background: #fff;
  color: #667eea;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}`;

const DEFAULT_JS = `// Example JavaScript code
document.getElementById('btn').addEventListener('click', function() {
  console.log('Button clicked!');
  alert('Hello from Code Studio!');
});

// Log a welcome message
console.log('Code Studio is ready!');
console.info('Happy coding!');`;

export function useCodeEditor() {
  const [html, setHtml] = useState(() => localStorage.getItem('htmlCode') || DEFAULT_HTML);
  const [css, setCss] = useState(() => localStorage.getItem('cssCode') || DEFAULT_CSS);
  const [js, setJs] = useState(() => localStorage.getItem('jsCode') || DEFAULT_JS);
  const [activeFile, setActiveFile] = useState<FileType>('html');
  const [modified, setModified] = useState({ html: false, css: false, js: false });
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);

  useEffect(() => {
    localStorage.setItem('htmlCode', html);
    setModified(prev => ({ ...prev, html: true }));
  }, [html]);

  useEffect(() => {
    localStorage.setItem('cssCode', css);
    setModified(prev => ({ ...prev, css: true }));
  }, [css]);

  useEffect(() => {
    localStorage.setItem('jsCode', js);
    setModified(prev => ({ ...prev, js: true }));
  }, [js]);

  const updateCode = useCallback((type: FileType, value: string) => {
    if (type === 'html') setHtml(value);
    else if (type === 'css') setCss(value);
    else if (type === 'js') setJs(value);
  }, []);

  const newProject = useCallback(() => {
    setHtml(DEFAULT_HTML);
    setCss(DEFAULT_CSS);
    setJs(DEFAULT_JS);
    setModified({ html: false, css: false, js: false });
  }, []);

  const addConsoleLog = useCallback((type: ConsoleLog['type'], message: string) => {
    const log: ConsoleLog = {
      id: Date.now().toString() + Math.random(),
      type,
      message,
      timestamp: new Date()
    };
    setConsoleLogs(prev => [...prev, log]);
  }, []);

  const clearConsole = useCallback(() => {
    setConsoleLogs([]);
  }, []);

  return {
    html,
    css,
    js,
    activeFile,
    modified,
    consoleLogs,
    setActiveFile,
    updateCode,
    newProject,
    addConsoleLog,
    clearConsole
  };
}