"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Phase = "input" | "hearing" | "document";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("input");
  const [idea, setIdea] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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
    const updated = [...newMessages, { role: "assistant" as const, content: data.message }];
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

  function reset() {
    setPhase("input");
    setIdea("");
    setMessages([]);
    setInput("");
    setDocument("");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            AIdeate
          </span>
          <span className="text-sm text-gray-500">アイデアを企画に変える</span>
        </div>
        {phase !== "input" && (
          <button
            onClick={reset}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            最初からやり直す
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 py-8">
        {/* Phase: input */}
        {phase === "input" && (
          <div className="flex flex-col gap-6 flex-1 justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                あなたのアイデアを教えてください
              </h1>
              <p className="text-gray-500">
                ざっくりした内容でOK。AIがヒアリングしながら企画書にまとめます。
              </p>
            </div>
            <textarea
              className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-gray-800 shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[160px]"
              placeholder="例：副業している人向けに、確定申告を自動化するアプリを作りたい"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) startHearing();
              }}
            />
            <button
              onClick={startHearing}
              disabled={!idea.trim() || loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-lg shadow hover:opacity-90 disabled:opacity-40 transition"
            >
              ヒアリングを始める →
            </button>
          </div>
        )}

        {/* Phase: hearing */}
        {phase === "hearing" && (
          <div className="flex flex-col flex-1 gap-4">
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-indigo-500 text-white"
                        : "bg-white text-gray-800 shadow-sm border border-gray-100"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 text-gray-400 text-sm">
                    考え中...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="flex gap-2 mt-2">
              <input
                className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="返答を入力..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="px-6 py-3 rounded-full bg-indigo-500 text-white font-medium text-sm hover:bg-indigo-600 disabled:opacity-40 transition"
              >
                送信
              </button>
            </div>
            <button
              onClick={() => generateDocument(messages)}
              disabled={loading || messages.length < 4}
              className="w-full py-3 rounded-full border border-indigo-300 text-indigo-600 font-medium text-sm hover:bg-indigo-50 disabled:opacity-40 transition"
            >
              企画書を生成する
            </button>
          </div>
        )}

        {/* Phase: document */}
        {phase === "document" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">企画書</h2>
              <button
                onClick={downloadMarkdown}
                className="px-4 py-2 rounded-full bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition"
              >
                Markdownでダウンロード
              </button>
            </div>
            {loading ? (
              <div className="text-gray-400 text-sm text-center py-16">企画書を生成中...</div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">
                  {document}
                </pre>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
