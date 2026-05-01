import { useRef, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import type { ConsoleLog } from '../types';

interface PreviewProps {
  html: string;
  css: string;
  js: string;
  onConsoleLog: (type: 'log' | 'info' | 'warn' | 'error', message: string) => void;
}

export function Preview({ html, css, js, onConsoleLog }: PreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const updatePreview = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const content = `
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

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(content);
    doc.close();
  }, [html, css, js]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'console') {
        onConsoleLog(e.data.method as ConsoleLog['type'], e.data.args.join(' '));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConsoleLog]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  return (
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
  );
}