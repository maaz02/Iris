import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { cn } from '../lib/utils';
import { askQuestion, fetchExamples } from '../lib/api';
import ResponseCard from './ResponseCard';

export default function ChatInterface({ sessionId }) {
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

  return (
    <div className="flex flex-col h-[600px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-800/50">
        <h2 className="text-sm font-medium text-zinc-100">Analysis Chat</h2>
        <p className="text-xs text-zinc-400">Ask questions about your data</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/50">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 bg-accent-950/50 text-accent-400 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">?</span>
            </div>
            <h3 className="text-lg font-medium text-zinc-100 mb-2">What would you like to know?</h3>
            <p className="text-sm text-zinc-400 max-w-sm">
              Ask any question about your uploaded dataset, and Iris will generate SQL to answer it along with visual charts.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {history.map((item) => (
              <ResponseCard key={item.id} data={item} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Examples Area */}
      {loadingExamples ? (
        <div className="px-6 py-3 bg-zinc-900 border-t border-zinc-800 flex flex-wrap gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="h-7 w-32 bg-zinc-800/50 animate-pulse rounded-full"></div>
          ))}
        </div>
      ) : examples.length > 0 ? (
        <div className="px-6 py-3 bg-zinc-900 border-t border-zinc-800 flex flex-wrap gap-2 justify-center">
          {examples.map((ex, idx) => (
            <button
              key={idx}
              onClick={() => setInput(ex)}
              className="text-xs px-3 py-1.5 bg-zinc-800 border border-zinc-700 hover:border-accent-500/50 hover:bg-zinc-800 text-zinc-300 rounded-full transition-all whitespace-nowrap"
            >
              {ex}
            </button>
          ))}
        </div>
      ) : null}

      {/* Input Area */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800">
        <form 
          onSubmit={handleSubmit}
          className={cn(
            "relative flex items-end gap-2 p-2 bg-zinc-950 border border-zinc-800 rounded-xl transition-all focus-within:ring-2 focus-within:ring-accent-500/20 focus-within:border-accent-500",
            !sessionId && "opacity-60 grayscale cursor-not-allowed"
          )}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={sessionId ? "Ask a question (e.g. What is the total revenue by region?)..." : "Upload a CSV first to start asking questions"}
            disabled={!sessionId || isWaiting}
            className="w-full max-h-[150px] min-h-[44px] bg-transparent border-0 resize-none py-2.5 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:ring-0 focus:outline-none"
            rows={1}
          />
          <button
            type="submit"
            disabled={!input.trim() || !sessionId || isWaiting}
            className={cn(
              "flex-shrink-0 p-2.5 rounded-lg text-white transition-all flex items-center justify-center mb-0.5 mr-0.5",
              input.trim() && sessionId && !isWaiting
                ? "bg-accent-600 hover:bg-accent-700 shadow-sm"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
