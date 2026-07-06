import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import ChartRenderer from './ChartRenderer';

export default function ResponseCard({ data }) {
  const { question, loading, error, result } = data;
  const [copied, setCopied] = useState(false);

  const handleCopy = (sql) => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* User Question */}
      <div className="flex justify-end">
        <div className="bg-surface border surface-border rounded-md rounded-tr-none shadow-premium p-md max-w-[80%]">
          <p className="font-body-md text-body-md text-on-surface">{question}</p>
        </div>
      </div>

      {/* System Response */}
      <div className="flex justify-start w-full mb-6">
        <div className="flex gap-md max-w-[90%] w-full">
          <div className="w-8 h-8 rounded bg-surface border surface-border flex-shrink-0 flex items-center justify-center text-indigo-accent mt-1">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          </div>
          
          <div className="flex-1 space-y-md">
            {loading ? (
              <div className="bg-surface border surface-border rounded-md rounded-tl-none shadow-premium p-md min-w-[200px]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-4 w-4 rounded-full bg-surface-variant animate-pulse"></div>
                  <div className="h-4 w-24 bg-surface-variant rounded animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-surface-variant rounded w-full animate-pulse"></div>
                  <div className="h-3 bg-surface-variant rounded w-5/6 animate-pulse"></div>
                  <div className="h-3 bg-surface-variant rounded w-4/6 animate-pulse"></div>
                </div>
              </div>
            ) : error ? (
              <div className="bg-error-container border border-error/30 rounded-md rounded-tl-none shadow-premium p-md inline-flex items-start gap-2 text-error">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="font-body-md text-body-md">{error}</p>
              </div>
            ) : result ? (
              <>
                {/* Answer Text */}
                {result.answer && (
                  <div className="bg-surface border surface-border rounded-md rounded-tl-none shadow-premium p-md">
                    <p className="font-body-md text-body-lg text-on-surface">{result.answer}</p>
                  </div>
                )}
                
                {/* Chart Rendering */}
                {result.chart && result.rows && result.rows.length > 0 && (
                  <div className="bg-surface border surface-border rounded-md shadow-premium p-md">
                    {result.chart.title && (
                      <div className="flex justify-between items-center mb-md">
                        <h4 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider flex items-center gap-sm">
                          <span className="material-symbols-outlined text-sm">bar_chart</span>
                          {result.chart.title}
                        </h4>
                        <span className="material-symbols-outlined text-on-surface-variant text-[16px] cursor-pointer hover:text-on-surface">more_vert</span>
                      </div>
                    )}
                    <ChartRenderer chart={result.chart} data={result.rows} />
                  </div>
                )}

                {/* Collapsible SQL */}
                {result.sql && (
                  <details className="group bg-surface border surface-border rounded-md shadow-premium overflow-hidden">
                    <summary className="flex items-center gap-sm p-sm cursor-pointer hover:bg-surface-variant transition-colors select-none font-label-sm text-label-sm text-on-surface">
                      <span className="material-symbols-outlined text-[16px] transition-transform group-open:rotate-90">chevron_right</span>
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">code</span>
                      View SQL
                    </summary>
                    <div className="bg-[#1a1a1a] p-md overflow-x-auto relative m-sm rounded-[8px] border surface-border">
                      <button 
                        onClick={() => handleCopy(result.sql)}
                        className="absolute top-sm right-sm p-xs rounded bg-surface-variant hover:bg-outline-variant text-on-surface-variant transition-colors" 
                        title="Copy SQL"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {copied ? 'check' : 'content_copy'}
                        </span>
                      </button>
                      <pre className="font-code text-code text-on-surface-variant m-0"><code>{result.sql}</code></pre>
                    </div>
                  </details>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
