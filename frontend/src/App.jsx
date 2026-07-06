import { useState } from 'react';
import UploadZone from './components/UploadZone';
import ChatInterface from './components/ChatInterface';
import { Aperture } from 'lucide-react';

function App() {
  const [sessionId, setSessionId] = useState(null);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Subtle canvas dot pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none"></div>
      
      <div className="w-full max-w-4xl flex flex-col gap-8 relative z-10">
        <header className="flex flex-col items-center justify-center mb-4 text-center">
          <div className="bg-accent-600 text-white p-3 rounded-2xl shadow-sm mb-4 inline-flex">
            <Aperture size={28} />
          </div>
          <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Iris Data Explorer</h1>
          <p className="mt-2 text-zinc-500 max-w-lg">
            Upload your dataset and ask questions in plain English. Iris will generate the SQL, execute it, and build charts for you.
          </p>
        </header>

        <main className="w-full flex flex-col gap-6">
          <UploadZone onUploadSuccess={(id) => setSessionId(id)} />
          
          <div className="relative">
            <ChatInterface sessionId={sessionId} />
          </div>
        </main>
        
        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-zinc-400">
          <p>Powered by FastAPI, React, and Tailwind CSS.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
