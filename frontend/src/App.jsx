import { useState } from 'react';
import UploadZone from './components/UploadZone';
import ChatInterface from './components/ChatInterface';
import { Aperture } from 'lucide-react';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [sessionKey, setSessionKey] = useState(Date.now());

  const handleNewSession = () => {
    setSessionId(null);
    setSessionKey(Date.now());
  };

  return (
    <div className="text-on-background font-body-md h-screen overflow-hidden flex flex-col">
      {/* Minimal Top Bar */}
      <header className="bg-surface dark:bg-surface text-primary dark:text-primary font-display text-body-lg docked full-width top-0 border-b border-outline-variant dark:border-outline-variant flat no shadows flex justify-between items-center px-lg py-sm w-full sticky z-50">
        <div className="flex items-center gap-sm">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-on-primary">
            <Aperture size={18} />
          </div>
          <span className="font-display text-headline-sm font-bold text-on-surface dark:text-on-surface">Iris</span>
        </div>
        <div>
          <button 
            onClick={handleNewSession}
            className="flex items-center gap-xs px-sm py-[6px] rounded-[8px] hover:bg-surface-variant text-on-surface-variant hover:text-on-surface transition-colors font-label-sm text-label-sm"
            title="Start a new session"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            New Session
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 h-full flex flex-col md:flex-row overflow-hidden bg-[#0f0f0f]">
        {/* Left Pane: Data Source (40%) */}
        <section className="w-full md:w-[40%] h-full border-r surface-border flex flex-col p-container-padding overflow-y-auto bg-surface relative z-10">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-lg">Data Source</h2>
          <UploadZone key={`upload-${sessionKey}`} onUploadSuccess={(id) => setSessionId(id)} />
        </section>

        {/* Right Pane: Iris AI Chat (60%) */}
        <section className="w-full md:w-[60%] h-full flex flex-col bg-[#0f0f0f] relative">
          <ChatInterface key={`chat-${sessionKey}`} sessionId={sessionId} />
        </section>
      </main>
    </div>
  );
}

export default App;
