import React from 'react';
import { Terminal, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AsciiPreview({ text, loading }) {
  const handleCopy = () => {
    if (text) {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    }
  };

  return (
    <div className="w-full card h-full flex flex-col overflow-hidden group">
      <div className="bg-[#18181b] border-b border-[#27272a] px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-[#a1a1aa]" />
          <span className="text-[11px] font-mono text-[#a1a1aa]">ascii_output.txt</span>
        </div>
        {text && !loading && (
          <button 
            onClick={handleCopy}
            className="text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors p-1 rounded hover:bg-[#27272a]"
            title="Copy Text"
          >
            <Copy size={14} />
          </button>
        )}
      </div>
      <div className="flex-1 bg-[#09090b] relative p-4 overflow-auto">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#09090b]/80 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#27272a] border-t-[#f4f4f5] rounded-full animate-spin"></div>
              <span className="font-mono text-[#a1a1aa] text-xs">Generating...</span>
            </div>
          </div>
        ) : text ? (
          <pre className="font-mono text-[8px] leading-[8px] text-[#f4f4f5] whitespace-pre font-medium">
            {text}
          </pre>
        ) : (
          <div className="h-full flex items-center justify-center text-[#71717a] font-mono text-xs">
            No output generated.
          </div>
        )}
      </div>
    </div>
  );
}
