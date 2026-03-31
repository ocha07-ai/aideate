"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Proposal = {
  id: string;
  title: string;
  idea: string;
  created_at: string;
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = localStorage.getItem("aideate_session_id");
    if (!sessionId) {
      setLoading(false);
      return;
    }
    fetch(`/api/proposals?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setProposals(data.proposals ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          AIdeate
        </span>
        <Link
          href="/"
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition"
        >
          ＋ 新しい企画書を作る
        </Link>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">企画書一覧</h1>

        {loading ? (
          <div className="text-center text-gray-400 py-16 text-sm">読み込み中...</div>
        ) : proposals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <p className="text-gray-400 text-sm mb-4">まだ保存された企画書がありません</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 transition"
            >
              アイデアを入力する
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {proposals.map((p) => (
              <Link
                key={p.id}
                href={`/proposals/${p.id}`}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-gray-800 group-hover:text-indigo-700 transition text-base leading-snug">
                    {p.title}
                  </h2>
                  <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                    {new Date(p.created_at).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{p.idea}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
