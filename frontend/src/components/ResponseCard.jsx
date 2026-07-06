import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import ChartRenderer from './ChartRenderer';

export default function ResponseCard({ data }) {
  const { question, loading, error, result } = data;
  const [showSql, setShowSql] = useState(false);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* User Question (Right aligned) */}
      <div className="flex justify-end w-full">
        <div className="bg-accent-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
          <p className="text-sm leading-relaxed">{question}</p>
        </div>
      </div>

      {/* System Response (Left aligned) */}
      <div className="flex justify-start w-full mb-6">
        <div className="flex gap-3 max-w-[90%]">
          <div className="w-8 h-8 rounded-full bg-accent-950/50 flex items-center justify-center shrink-0 shadow-sm border border-accent-900/50">
            <Sparkles size={16} className="text-accent-400" />
          </div>
          
          <div className="flex flex-col gap-3 w-full">
            {loading ? (
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl rounded-tl-sm p-5 shadow-sm min-w-[200px]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-4 w-4 rounded-full bg-zinc-700 animate-pulse"></div>
                  <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-zinc-800 rounded w-full animate-pulse"></div>
                  <div className="h-3 bg-zinc-800 rounded w-5/6 animate-pulse"></div>
                  <div className="h-3 bg-zinc-800 rounded w-4/6 animate-pulse"></div>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-950/50 border border-red-900/50 rounded-2xl rounded-tl-sm p-4 inline-flex items-start gap-2 shadow-sm text-red-400">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            ) : result ? (
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl rounded-tl-sm shadow-sm overflow-hidden flex flex-col w-full">
                {/* Answer Text */}
                {result.answer && (
                  <div className="p-5 border-b border-zinc-700/50">
                    <p className="text-zinc-200 text-sm leading-relaxed">{result.answer}</p>
                  </div>
                )}
                
                {/* Chart Rendering */}
                {result.chart && result.rows && result.rows.length > 0 && (
                  <div className="p-5 overflow-hidden">
                    <ChartRenderer chart={result.chart} data={result.rows} />
                  </div>
                )}

                {/* Collapsible SQL */}
                {result.sql && (
                  <div className="bg-zinc-900/50 border-t border-zinc-700/50">
                    <button 
                      onClick={() => setShowSql(!showSql)}
                      className="w-full px-5 py-3 flex items-center justify-between text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      <span>View generated SQL</span>
                      {showSql ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {showSql && (
                      <div className="px-5 pb-5 pt-1">
                        <pre className="bg-zinc-950 text-zinc-300 p-4 rounded-xl text-xs overflow-x-auto font-mono">
                          <code>{result.sql}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
