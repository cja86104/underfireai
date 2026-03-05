'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { LANGUAGE_DISPLAY_NAMES, type ProgrammingLanguage } from '@/types/coding';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: ProgrammingLanguage;
  onLanguageChange?: (language: ProgrammingLanguage) => void;
  availableLanguages?: ProgrammingLanguage[];
  disabled?: boolean;
  placeholder?: string;
  minHeight?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  language,
  onLanguageChange,
  availableLanguages = ['javascript', 'python', 'typescript'],
  disabled = false,
  placeholder = '// Write your code here...',
  minHeight = '300px',
  showLineNumbers = true,
  className,
}: CodeEditorProps): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);

  // Update line count when value changes
  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(Math.max(lines, 1));
  }, [value]);

  // Sync scroll between textarea and line numbers
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Handle tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Insert 2 spaces for tab
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      // Move cursor after the inserted spaces
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };

  // Generate line numbers
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className={cn('flex flex-col rounded-lg border border-slate-700 bg-slate-900 overflow-hidden', className)}>
      {/* Header with language selector */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-slate-500 ml-2">
            {LANGUAGE_DISPLAY_NAMES[language]}
          </span>
        </div>

        {onLanguageChange && availableLanguages.length > 1 && (
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as ProgrammingLanguage)}
            disabled={disabled}
            className="text-xs bg-slate-700 text-slate-300 rounded px-2 py-1 border border-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_DISPLAY_NAMES[lang]}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Editor area */}
      <div className="flex overflow-hidden" style={{ minHeight }}>
        {/* Line numbers */}
        {showLineNumbers && (
          <div
            ref={lineNumbersRef}
            className="flex-shrink-0 py-3 px-2 bg-slate-800/30 border-r border-slate-700/50 overflow-hidden select-none"
            style={{ minWidth: '3rem' }}
          >
            {lineNumbers.map((num) => (
              <div
                key={num}
                className="text-right text-xs text-slate-500 leading-6 font-mono"
              >
                {num}
              </div>
            ))}
          </div>
        )}

        {/* Code textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          data-lenis-prevent
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className={cn(
            'flex-1 p-3 bg-transparent text-slate-100 font-mono text-sm leading-6 resize-none',
            'focus:outline-none placeholder:text-slate-600',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'overflow-auto'
          )}
          style={{ minHeight }}
        />
      </div>

      {/* Footer with stats */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-700 bg-slate-800/30 text-xs text-slate-500">
        <span>Lines: {lineCount}</span>
        <span>Characters: {value.length}</span>
      </div>
    </div>
  );
}
