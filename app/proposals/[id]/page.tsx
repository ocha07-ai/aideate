"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { renderMarkdown } from "@/app/components/render-markdown";

type Proposal = {
  id: string;
  title: string;
  content: string;
  idea: string;
  created_at: string;
};

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const sessionId = localStorage.getItem("aideate_session_id");
    if (!sessionId) {
      setLoading(false);
      return;
    }
    fetch(`/api/proposals/${id}?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setProposal(data.proposal ?? null);
        setLoading(false);
      });
  }, [id]);

  async function copyToClipboard() {
    if (!proposal) return;
    await navigator.clipboard.writeText(proposal.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadMarkdown() {
    if (!proposal) return;
    const blob = new Blob([proposal.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${proposal.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteProposal() {
    if (!proposal || !confirm("この企画書を削除しますか？")) return;
    setDeleting(true);
    const sessionId = localStorage.getItem("aideate_session_id");
    await fetch(`/api/proposals/${id}?sessionId=${sessionId}`, {
      method: "DELETE",
    });
    router.push("/proposals");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center text-gray-400 text-sm">
        読み込み中...
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 text-sm">企画書が見つかりませんでした</p>
        <Link href="/proposals" className="text-indigo-600 text-sm hover:underline">
          一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          AIdeate
        </span>
        <Link
          href="/proposals"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition"
        >
          ← 一覧に戻る
        </Link>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{proposal.title}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(proposal.created_at).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
            >
              {copied ? "✓ コピー済み" : "コピー"}
            </button>
            <button
              onClick={downloadMarkdown}
              className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
            >
              DL
            </button>
            <button
              onClick={deleteProposal}
              disabled={deleting}
              className="px-4 py-2 rounded-full border border-red-100 bg-white text-red-400 text-sm font-medium hover:bg-red-50 disabled:opacity-40 transition"
            >
              削除
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="space-y-1">{renderMarkdown(proposal.content)}</div>
        </div>
      </main>
    </div>
  );
}
