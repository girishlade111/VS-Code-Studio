import { FileCode2, FileJson } from 'lucide-react';
import type { FileType } from '../types';

interface EditorTabsProps {
  activeFile: FileType;
  onChange: (file: FileType) => void;
}

const files = [
  { type: 'html' as FileType, name: 'index.html', icon: FileCode2 },
  { type: 'css' as FileType, name: 'styles.css', icon: FileCode2 },
  { type: 'js' as FileType, name: 'script.js', icon: FileJson },
] as const;

export function EditorTabs({ activeFile, onChange }: EditorTabsProps) {
  return (
    <div className="editor-tabs">
      {files.map(({ type, name, icon: Icon }) => (
        <button
          key={type}
          className={`editor-tab ${activeFile === type ? 'active' : ''}`}
          onClick={() => onChange(type)}
        >
          <Icon size={14} />
          {name}
        </button>
      ))}
    </div>
  );
}