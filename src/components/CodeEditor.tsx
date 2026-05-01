import { useRef, useEffect, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';

interface CodeEditorProps {
  value: string;
  language: 'html' | 'css' | 'javascript';
  theme: 'vs' | 'vs-dark';
  onChange: (value: string) => void;
  onCursorChange?: (line: number, column: number) => void;
}

export function CodeEditor({ value, language, theme, onChange, onCursorChange }: CodeEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    
    if (onCursorChange) {
      editor.onDidChangeCursorPosition((e) => {
        onCursorChange(e.position.lineNumber, e.position.column);
      });
    }
  }, [onCursorChange]);

  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  }, [onChange]);

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      theme={theme}
      onMount={handleMount}
      onChange={handleChange}
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
  );
}