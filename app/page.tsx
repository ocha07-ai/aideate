"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { renderMarkdown } from "@/app/components/render-markdown";

type Message = { role: "user" | "assistant"; content: string };
type Phase = "input" | "hearing" | "document";

function LoadingDots() {
  return (
    <span className="inline-flex gap-1 items-center py-0.5">
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
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
                i < currentIndex ? "bg-indigo-400" : "bg-gray-200"
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
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
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition"
            >
              <span>↩</span>
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                あなたのアイデアを教えてください
              </h1>
              <p className="text-gray-500 text-sm sm:text-base">
                ざっくりした内容でOK。AIがヒアリングしながら企画書にまとめます。
              </p>
            </div>
            <div className="relative">
              <textarea
                className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-gray-800 shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[160px] text-base"
                placeholder="例：副業している人向けに、確定申告を自動化するアプリを作りたい"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.metaKey) startHearing();
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
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-lg shadow-md hover:shadow-lg hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <LoadingDots /> : "ヒアリングを始める →"}
            </button>
            <p className="text-center text-xs text-gray-400">
              ⌘+Enter でもスタートできます
            </p>
          </div>
        )}

        {/* Phase: hearing */}
        {phase === "hearing" && (
          <div className="flex flex-col flex-1 gap-3 min-h-0">
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pb-2">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {m.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      AI
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-indigo-500 text-white rounded-br-md"
                        : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-end gap-2 justify-start">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    AI
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                    <LoadingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="flex gap-2 pt-1">
              <input
                className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
                className="px-5 py-3 rounded-full bg-indigo-500 text-white font-medium text-sm hover:bg-indigo-600 disabled:opacity-40 transition"
              >
                送信
              </button>
            </div>
            <button
              onClick={() => generateDocument(messages)}
              disabled={loading || messages.length < 4}
              className="w-full py-3 rounded-full border-2 border-indigo-300 text-indigo-600 font-medium text-sm hover:bg-indigo-50 disabled:opacity-40 transition flex items-center justify-center gap-2"
            >
              <span>📄</span> 今すぐ企画書を生成する
            </button>
          </div>
        )}

        {/* Phase: document */}
        {phase === "document" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">企画書</h2>
              <div className="flex gap-2">
                <button
                  onClick={saveProposal}
                  disabled={loading || !document || saved || saving}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition"
                >
                  {saving ? "保存中..." : saved ? "✓ 保存済み" : "保存する"}
                </button>
                <button
                  onClick={copyToClipboard}
                  disabled={loading || !document}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  {copied ? "✓ コピー済み" : "コピー"}
                </button>
                <button
                  onClick={downloadMarkdown}
                  disabled={loading || !document}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition"
                >
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
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="space-y-1">{renderMarkdown(document)}</div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
