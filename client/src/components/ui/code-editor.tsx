import { useRef, useEffect } from "react";
import * as monaco from "monaco-editor";
import { cn } from "@/lib/utils";

// Initialize Monaco Editor with language syntax
const initializeMonaco = () => {
  if (typeof window !== 'undefined') {
    monaco.languages.register({ id: 'solidity' });
    monaco.languages.setMonarchTokensProvider('solidity', {
      tokenizer: {
        root: [
          [/pragma\s+solidity\s+\^?\d+\.\d+\.\d+;/, 'pragma'],
          [/contract|interface|library/, 'keyword'],
          [/function|constructor|event|modifier|struct|enum|mapping/, 'keyword'],
          [/(public|private|internal|external|payable|view|pure)/, 'keyword'],
          [/(uint|int|bool|address|bytes|string)(\d*)?/, 'type'],
          [/\/\/.*/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          [/true|false/, 'boolean'],
          [/[0-9]+/, 'number'],
          [/".*?"/, 'string'],
          [/=>/, 'operator'],
        ],
        comment: [
          [/[^/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[/*]/, 'comment']
        ],
      }
    });

    monaco.languages.register({ id: 'rust' });
    monaco.languages.setMonarchTokensProvider('rust', {
      tokenizer: {
        root: [
          [/fn|pub|mod|use|struct|enum|trait|impl|for|self|mut|let|return/, 'keyword'],
          [/u8|u16|u32|u64|u128|i8|i16|i32|i64|i128|bool|str|String/, 'type'],
          [/#\[.*?\]/, 'attribute'],
          [/\/\/.*/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          [/true|false/, 'boolean'],
          [/[0-9]+/, 'number'],
          [/".*?"/, 'string'],
          [/->/, 'operator'],
        ],
        comment: [
          [/[^/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[/*]/, 'comment']
        ],
      }
    });
  }
};

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language: 'solidity' | 'rust';
  readOnly?: boolean;
  className?: string;
  height?: string;
}

export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  className,
  height = "400px"
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    initializeMonaco();

    if (editorRef.current) {
      monacoEditor.current = monaco.editor.create(editorRef.current, {
        value,
        language,
        theme: 'vs-dark',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        readOnly,
        fontSize: 14,
        fontFamily: '"JetBrains Mono", monospace',
        lineNumbers: 'on',
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
        }
      });

      if (onChange) {
        monacoEditor.current.onDidChangeModelContent(() => {
          onChange(monacoEditor.current?.getValue() || '');
        });
      }
    }

    return () => {
      monacoEditor.current?.dispose();
    };
  }, []);

  // Update value if it changes externally
  useEffect(() => {
    if (monacoEditor.current && value !== monacoEditor.current.getValue()) {
      monacoEditor.current.setValue(value);
    }
  }, [value]);

  return (
    <div 
      ref={editorRef} 
      className={cn("border border-border rounded-md", className)}
      style={{ height }}
    />
  );
}
