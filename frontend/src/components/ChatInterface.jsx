import { useState, useRef, useEffect } from 'react';
import { askQuestion, fetchExamples } from '../lib/api';
import ResponseCard from './ResponseCard';
import { cn } from '../lib/utils';

export default function ChatInterface({ sessionId, onClear }) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const [isWaiting, setIsWaiting] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const [examples, setExamples] = useState([]);
  const [loadingExamples, setLoadingExamples] = useState(false);

  useEffect(() => {
    const loadExamples = async () => {
      setLoadingExamples(true);
      try {
        const data = await fetchExamples(sessionId);
        if (data.examples) {
          setExamples(data.examples);
        }
      } catch (e) {
        console.error("Failed to load examples", e);
      } finally {
        setLoadingExamples(false);
      }
    };
    loadExamples();
  }, [sessionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const query = input.trim();
    
    if (!query || !sessionId || isWaiting) return;
    
    setInput('');
    setIsWaiting(true);
    
    const newEntry = {
      id: Date.now(),
      question: query,
      loading: true,
      error: null,
      result: null,
    };
    
    setHistory((prev) => [...prev, newEntry]);
    
    try {
      const data = await askQuestion(sessionId, query);
      setHistory((prev) => 
        prev.map((item) => 
          item.id === newEntry.id 
            ? { ...item, loading: false, result: data } 
            : item
        )
      );
    } catch (error) {
      setHistory((prev) => 
        prev.map((item) => 
          item.id === newEntry.id 
            ? { ...item, loading: false, error: error.response?.data?.detail || 'An error occurred while processing your question.' } 
            : item
        )
      );
    } finally {
      setIsWaiting(false);
    }
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportMarkdown = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let md = `# Iris Analysis Session — ${new Date().toLocaleDateString()}\n\n`;
    
    history.forEach((item) => {
      md += `## ${item.question}\n\n`;
      if (item.result?.answer) {
        md += `${item.result.answer}\n\n`;
      }
      if (item.result?.sql) {
        md += `\`\`\`sql\n${item.result.sql}\n\`\`\`\n\n`;
      }
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iris_session_${timestamp}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportCsv = () => {
    if (history.length === 0) return;
    const lastResult = history[history.length - 1].result;
    if (!lastResult || !lastResult.rows || lastResult.rows.length === 0) return;

    const rows = lastResult.rows;
    const headers = Object.keys(rows[0]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += headers.map(header => {
        let val = row[header];
        if (val === null || val === undefined) val = '';
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      }).join(',') + '\n';
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iris_results_${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  return (
    <>
      {/* Chat Header */}
      <div className="px-container-padding py-md border-b surface-border flex items-center justify-between bg-[#0f0f0f]/80 backdrop-blur-sm z-20 shrink-0">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-indigo-accent">smart_toy</span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Iris AI Assistant</h2>
        </div>
        <div className="flex gap-sm relative">
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-xs rounded hover:bg-surface-variant text-on-surface-variant transition-colors flex items-center" 
            title="Export Thread"
          >
            <span className="material-symbols-outlined text-[20px]">ios_share</span>
          </button>
          
          {showExportMenu && (
            <div className="absolute top-full right-0 mt-xs w-48 bg-surface-container-high border surface-border rounded-md shadow-lg py-xs z-50">
              <button 
                onClick={handleExportMarkdown}
                className="w-full text-left px-sm py-xs hover:bg-surface-variant text-on-surface font-body-md text-body-md flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[16px]">description</span>
                Export as Markdown
              </button>
              <button 
                onClick={handleExportCsv}
                disabled={history.length === 0 || !history[history.length - 1].result?.rows}
                className="w-full text-left px-sm py-xs hover:bg-surface-variant text-on-surface font-body-md text-body-md flex items-center gap-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[16px]">table</span>
                Export as CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Feed */}
      <div className={cn("flex-1 overflow-y-auto p-container-padding flex flex-col", history.length === 0 ? "items-center justify-center" : "")}>
        {history.length === 0 ? (
          <div className="flex flex-col items-center text-center" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
            <div className="w-12 h-12 bg-surface-variant text-on-surface-variant rounded-full flex items-center justify-center mb-4 border surface-border shrink-0">
              <span className="material-symbols-outlined text-2xl">help</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">What would you like to know?</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Ask any question about your uploaded dataset, and Iris will generate SQL to answer it along with visual charts.
            </p>
          </div>
        ) : (
          <div className="flex flex-col space-y-xl w-full">
            {history.map((item) => (
              <ResponseCard key={item.id} data={item} />
            ))}
            <div ref={messagesEndRef} className="h-4 shrink-0" />
          </div>
        )}
      </div>

      {/* Command Bar Input & Examples */}
      <div className="w-full px-container-padding pb-container-padding pt-md bg-[#0f0f0f] z-20 shrink-0">
        {loadingExamples ? (
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="h-7 w-32 bg-surface-variant animate-pulse rounded-full border surface-border"></div>
            ))}
          </div>
        ) : examples.length > 0 ? (
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {examples.map((ex, idx) => (
              <button
                key={idx}
                onClick={() => setInput(ex)}
                className="font-label-sm text-label-sm px-3 py-1.5 bg-surface border surface-border hover:border-indigo-accent hover:bg-surface text-on-surface rounded-full transition-all whitespace-nowrap"
              >
                {ex}
              </button>
            ))}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="relative bg-surface border surface-border rounded-md shadow-premium flex items-center p-xs pl-sm focus-within:border-indigo-accent focus-within:ring-1 focus-within:ring-indigo-accent transition-all">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!sessionId || isWaiting}
            className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface font-body-md placeholder:text-outline p-sm outline-none w-full" 
            placeholder={sessionId ? "Ask Iris anything about your data..." : "Upload a file first to start asking questions"}
            type="text"
          />
          
          <div className="flex items-center gap-xs pr-sm shrink-0">
            <button 
              type="submit"
              disabled={!input.trim() || !sessionId || isWaiting}
              className={cn(
                "w-8 h-8 rounded flex items-center justify-center transition-colors ml-xs",
                input.trim() && sessionId && !isWaiting 
                  ? "bg-indigo-accent text-white hover:bg-opacity-90"
                  : "bg-surface-variant text-on-surface-variant cursor-not-allowed"
              )}
            >
              <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
            </button>
          </div>
        </form>
        <div className="text-center mt-xs hidden sm:block">
          <p className="text-[10px] text-on-surface-variant font-label-sm">Iris AI can make mistakes. Verify critical data.</p>
        </div>
      </div>
    </>
  );
}
