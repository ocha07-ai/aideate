"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { renderMarkdown } from "@/app/components/render-markdown";

type Message = { role: "user" | "assistant"; content: string };
type Phase = "input" | "hearing" | "document";

function LoadingDots() {
  return (
    <span className="inline-flex gap-1 items-center py-0.5">
      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
    </span>
  );
}

function StepIndicator({ phase }: { phase: Phase }) {
  const steps: { id: Phase; label: string }[] = [
    { id: "input", label: "アイデア入力" },
    { id: "hearing", label: "ヒアリング" },
    { id: "document", label: "企画書" },
  ];
  const currentIndex = steps.findIndex((s) => s.id === phase);

  return (
    <div className="flex items-start justify-center gap-0 mb-8">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center w-20">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                i < currentIndex
                  ? "bg-indigo-400 text-white"
                  : i === currentIndex
                  ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white ring-4 ring-indigo-100 scale-110"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {i < currentIndex ? "✓" : i + 1}
            </div>
            <span
              className={`text-xs mt-1.5 font-medium text-center leading-tight ${
                i === currentIndex
                  ? "text-indigo-600"
                  : i < currentIndex
                  ? "text-indigo-400"
                  : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-12 h-0.5 mb-5 mx-1 transition-all duration-500 ${
                i < currentIndex
                  ? "bg-gradient-to-r from-indigo-400 to-purple-400"
                  : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("input");
  const [idea, setIdea] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let id = localStorage.getItem("aideate_session_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("aideate_session_id", id);
    }
    setSessionId(id);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function startHearing() {
    if (!idea.trim()) return;
    setLoading(true);
    setPhase("hearing");

    const initial: Message[] = [{ role: "user", content: idea }];
    setMessages(initial);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: initial }),
    });
    const data = await res.json();
    setMessages([...initial, { role: "assistant", content: data.message }]);
    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: input },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages }),
    });
    const data = await res.json();
    const updated = [
      ...newMessages,
      { role: "assistant" as const, content: data.message },
    ];
    setMessages(updated);
    setLoading(false);

    if (data.message.includes("企画書を作成する準備ができました")) {
      setTimeout(() => generateDocument(updated), 500);
    }
  }

  async function generateDocument(msgs: Message[]) {
    setLoading(true);
    setPhase("document");
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs }),
    });
    const data = await res.json();
    setDocument(data.document);
    setLoading(false);
  }

  async function saveProposal() {
    if (!document || !sessionId) return;
    setSaving(true);
    await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: document, idea, sessionId }),
    });
    setSaving(false);
    setSaved(true);
  }

  function reset() {
    setPhase("input");
    setIdea("");
    setMessages([]);
    setInput("");
    setDocument("");
    setCopied(false);
    setSaved(false);
  }

  function downloadMarkdown() {
    const blob = new Blob([document], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a") as HTMLAnchorElement;
    a.href = url;
    a.download = "企画書.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(document);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      {/* Background blobs — subtle depth without the generic purple gradient */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -top-48 -right-48 w-[500px] h-[500px] bg-indigo-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-violet-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-purple-50 rounded-full blur-3xl opacity-60" />
      </div>

      {/* Header */}
      <header className="bg-white/70 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent tracking-tight">
            AIdeate
          </span>
          <span className="text-sm text-gray-400 hidden sm:inline">
            アイデアを企画に変える
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/proposals"
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition"
          >
            企画書一覧
          </Link>
          {phase !== "input" && (
            <button
              onClick={reset}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10a.75.75 0 010-1.5h3.625a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">最初からやり直す</span>
              <span className="sm:hidden">やり直す</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 py-8">
        <StepIndicator phase={phase} />

        {/* Phase: input */}
        {phase === "input" && (
          <div className="flex flex-col gap-5 flex-1 justify-center -mt-4">
            <div className="text-center">
              {/* Decorative icon */}
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                    <path d="M12 .75a8.25 8.25 0 00-4.135 15.39c.686.398 1.115 1.008 1.134 1.623a.75.75 0 00.577.706c.352.083.71.148 1.074.195.323.041.6-.218.6-.544v-4.661a6.714 6.714 0 01-.937-.171.75.75 0 11.374-1.453 5.261 5.261 0 002.626 0 .75.75 0 11.374 1.452 6.712 6.712 0 01-.937.172v4.66c0 .327.277.586.6.545.364-.047.722-.112 1.074-.195a.75.75 0 00.577-.706c.02-.615.448-1.225 1.134-1.623A8.25 8.25 0 0012 .75z" />
                    <path fillRule="evenodd" d="M9.75 21a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zm.75-2.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">
                あなたのアイデアを教えてください
              </h1>
              <p className="text-gray-500 text-sm sm:text-base">
                ざっくりした内容でOK。AIがヒアリングしながら企画書にまとめます。
              </p>
            </div>
            <div className="relative group">
              <textarea
                className="w-full rounded-2xl border border-gray-200 bg-white/80 p-4 text-gray-800 shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-200 focus:shadow-lg focus:shadow-indigo-50 min-h-[160px] text-base transition-all duration-200 placeholder:text-gray-400"
                placeholder="例：副業している人向けに、確定申告を自動化するアプリを作りたい"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) startHearing();
                }}
              />
              {idea.length > 0 && (
                <span className="absolute bottom-3 right-4 text-xs text-gray-300 select-none">
                  {idea.length}字
                </span>
              )}
            </div>
            <button
              onClick={startHearing}
              disabled={!idea.trim() || loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold text-lg shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 hover:opacity-95 disabled:opacity-40 disabled:shadow-none transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? <LoadingDots /> : (
                <>
                  ヒアリングを始める
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-400">
              ⌘+Enter（Mac）/ Ctrl+Enter（Windows）でもスタートできます
            </p>
          </div>
        )}

        {/* Phase: hearing */}
        {phase === "hearing" && (
          <div className="flex flex-col flex-1 min-h-0 -mx-4 rounded-2xl overflow-hidden border border-gray-200/80 shadow-md shadow-gray-100">
            {/* Chat area */}
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto px-4 py-4 bg-slate-50/80">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {m.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                      AI
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                      m.role === "user"
                        ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white rounded-br-sm"
                        : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-end gap-2 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                    AI
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
                    <LoadingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="bg-white border-t border-gray-100 px-3 py-3 flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <input
                  className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent focus:bg-white transition-all duration-150"
                  placeholder="返答を入力..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) sendMessage();
                  }}
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center disabled:opacity-40 transition-all duration-150 hover:opacity-90 active:scale-95 shrink-0 shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => generateDocument(messages)}
                disabled={loading || messages.length < 4}
                className="w-full py-2 rounded-full border border-indigo-200 text-indigo-600 font-medium text-xs hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-40 transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75-6.75a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
                  <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                </svg>
                今すぐ企画書を生成する
              </button>
            </div>
          </div>
        )}

        {/* Phase: document */}
        {phase === "document" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">企画書</h2>
              <div className="flex gap-2">
                <button
                  onClick={saveProposal}
                  disabled={loading || !document || saved || saving}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all duration-150 active:scale-[0.98] shadow-sm shadow-indigo-200"
                >
                  {saving ? "保存中..." : saved ? "✓ 保存済み" : "保存する"}
                </button>
                <button
                  onClick={copyToClipboard}
                  disabled={loading || !document}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 transition-all duration-150 active:scale-[0.98]"
                >
                  {copied ? "✓ コピー済み" : "コピー"}
                </button>
                <button
                  onClick={downloadMarkdown}
                  disabled={loading || !document}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 transition-all duration-150 active:scale-[0.98] flex items-center gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                  </svg>
                  DL
                </button>
              </div>
            </div>
            {loading ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-16 shadow-sm flex flex-col items-center gap-4 text-gray-400">
                <LoadingDots />
                <span className="text-sm">企画書を生成中...</span>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-md shadow-gray-100">
                <div className="space-y-1">{renderMarkdown(document)}</div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
