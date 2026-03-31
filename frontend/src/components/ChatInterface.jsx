import React, { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import { sendMessageStream, sendAgentMessage, transcribeAudio } from "../api/chat";

export default function ChatInterface() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("medassist_chat_history");
    if (saved) return JSON.parse(saved);
    return [{ role: "assistant", content: "Bonjour ! Je suis MedAssist 🩺\nPosez-moi vos questions médicales — je réponds en citant mes sources." }];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState("rag"); // "rag" | "agent"
  const [isRecording, setIsRecording] = useState(false);
  const bottomRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    localStorage.setItem("medassist_chat_history", JSON.stringify(messages));
  }, [messages]);

  const clearHistory = () => {
    if (window.confirm("Êtes-vous sûr de vouloir effacer l'historique complet pour ce patient ?")) {
      const initMsg = [{ role: "assistant", content: "Bonjour ! Je suis MedAssist 🩺\nPosez-moi vos questions médicales — je réponds en citant mes sources." }];
      setMessages(initMsg);
      localStorage.setItem("medassist_chat_history", JSON.stringify(initMsg));
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;
    const userMsg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    if (mode === "rag") {
      setMessages(prev => [...prev, { role: "assistant", content: "", isStreaming: true }]);
      await sendMessageStream(text, (chunk) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      });
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].isStreaming = false;
        return updated;
      });
    } else {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const result = await sendAgentMessage(text, history);
      setMessages(prev => [...prev, { role: "assistant", content: result.answer }]);
    }
    setIsLoading(false);
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    chunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = e => chunksRef.current.push(e.data);
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/mp3" });
      const transcription = await transcribeAudio(blob);
      sendMessage(transcription);
    };
    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Sub-mode toggle (RAG vs Agent) */}
      <div className="flex items-center justify-between px-6 py-2 bg-gray-800/60 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500">
            LLM:{" "}
            <strong className="text-gray-300">
              {mode === "rag" ? "📚 RAG — Document retrieval" : "🤖 Agent — Multi-step reasoning"}
            </strong>
          </p>
          <button 
            onClick={clearHistory}
            className="text-[10px] bg-red-900/40 hover:bg-red-800/60 text-red-300 px-2 py-1 rounded transition-colors"
            title="Effacer l'historique de conversation"
          >
            🗑️ Nouveau Patient
          </button>
        </div>
        <div className="flex gap-2">
          {["rag", "agent"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                mode === m ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              {m === "rag" ? "📚 RAG" : "🤖 Agent"}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {messages.map((msg, i) => (
          <MessageBubble key={i} {...msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center gap-3 bg-gray-700 rounded-2xl px-4 py-3">
          <input
            className="flex-1 bg-transparent outline-none text-sm placeholder-gray-400"
            placeholder="Posez votre question médicale..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            disabled={isLoading}
          />
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2 rounded-full transition-all ${
              isRecording ? "bg-red-500 animate-pulse" : "bg-gray-600 hover:bg-gray-500"
            }`}
          >
            🎤
          </button>
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          >
            {isLoading ? "..." : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}
