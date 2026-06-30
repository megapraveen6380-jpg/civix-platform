import React, { useEffect, useRef } from 'react';
import { NotificationLog } from '../types';
import { Terminal, Trash2 } from 'lucide-react';

interface NotificationConsoleProps {
  logs: NotificationLog[];
  onClear: () => void;
}

export default function NotificationConsole({
  logs,
  onClear,
}: NotificationConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs container to bottom when new logs are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogStyle = (type: string) => {
    switch (type) {
      case 'AI':
        return 'text-cyan-400';
      case 'SYSTEM':
        return 'text-blue-400';
      case 'INFO':
        return 'text-slate-400';
      case 'BROADCAST':
        return 'text-purple-400';
      case 'VERIFY':
        return 'text-emerald-400';
      case 'DISPATCH':
        return 'text-orange-400';
      case 'ALERT':
        return 'text-amber-400 font-semibold';
      case 'REWARD':
        return 'text-pink-400 font-bold';
      default:
        return 'text-slate-200';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col h-[524px]" id="panel-console">
      <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3 shrink-0">
        <h3 className="text-white font-mono font-bold text-xs flex items-center gap-1.5 uppercase tracking-widest text-slate-200">
          <Terminal className="w-4 h-4 text-emerald-500 animate-pulse" />
          Platform System Logs
        </h3>
        <button 
          onClick={onClear} 
          className="text-[10px] text-slate-500 hover:text-slate-300 font-bold font-mono uppercase tracking-wider flex items-center gap-1 transition-colors bg-transparent border-0 cursor-pointer outline-none"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed flex flex-col gap-2 p-1 scrolling-touch"
      >
        {logs.map((log) => (
          <div key={log.id} className="transition border-b border-slate-800/30 pb-1.5 last:border-0">
            <span className="text-slate-600 mr-2">[{log.timestamp}]</span>
            <strong className={`${getLogStyle(log.type)} mr-1.5`}>{log.type}:</strong>
            <span className="text-slate-300 select-all">{log.text}</span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-slate-600 text-xs italic select-none">
            Console cleared. Ready for next community incident reporting...
          </div>
        )}
      </div>
    </div>
  );
}
