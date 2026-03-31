import React, { useState, useEffect } from "react";
import ChatInterface from "./components/ChatInterface";
import PredictivePanel from "./components/PredictivePanel";

const STORAGE_KEY = "medassist_app_mode";

export default function App() {
  const [appMode, setAppMode] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "generative"
  );

  // Persist selection across page refreshes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, appMode);
  }, [appMode]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* ── Global header with mode switcher ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700/70 shadow-md z-10 flex-shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">🩺</span>
          <div>
            <h1 className="font-black text-base tracking-tight leading-none">
              MedAssist AI
            </h1>
            <p className="text-[11px] text-gray-400 leading-none mt-0.5">
              {appMode === "generative"
                ? "RAG · Agent · Multimodal"
                : "Predictive · Diagnosis · Risk · Dosage"}
            </p>
          </div>
        </div>

        {/* Mode switcher */}
        <div className="flex items-center gap-1 bg-gray-700/60 rounded-xl p-1">
          <button
            id="mode-generative"
            onClick={() => setAppMode("generative")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
              appMode === "generative"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-600/50"
            }`}
          >
            💬 Generative
          </button>
          <button
            id="mode-predictive"
            onClick={() => setAppMode("predictive")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
              appMode === "predictive"
                ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-600/50"
            }`}
          >
            🔮 Predictive
          </button>
        </div>
      </header>

      {/* ── Main content area ── */}
      <main className="flex-1 overflow-hidden">
        {appMode === "generative" ? <ChatInterface /> : <PredictivePanel />}
      </main>
    </div>
  );
}
