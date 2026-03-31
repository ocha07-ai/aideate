import React from "react";

// ─── インライン装飾 ───────────────────────���────────────────────
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i} className="italic text-gray-500">{part.slice(1, -1)}</em>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── スコアバー ───────────────────��────────────────────��───────
function ScoreBar({ text }: { text: string }) {
  const m = text.replace(/\*\*/g, "").match(/^(\d+)\/(\d+)/);
  if (!m) return <span className="text-xs text-gray-700">{renderInline(text)}</span>;

  const cur = parseInt(m[1]), max = parseInt(m[2]);
  const pct = Math.round((cur / max) * 100);
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-indigo-500" : pct >= 40 ? "bg-amber-500" : "bg-red-400";
  const rest = text.replace(/\*\*/g, "").replace(/^\d+\/\d+\s*█*░*/, "").trim();

  return (
    <span className="flex items-center gap-2">
      <span className="w-10 text-right text-xs font-bold text-gray-700 shrink-0">{cur}/{max}</span>
      <span className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[80px]">
        <span className={`block h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs text-gray-400 w-8 shrink-0">{pct}%</span>
      {rest && <span className="text-xs text-gray-500 hidden sm:inline">{rest}</span>}
    </span>
  );
}

// ─── テーブルセル ──────────────────────────��─────────────────���─
function TableCell({ text, isHeader }: { text: string; isHeader: boolean }) {
  const t = text.trim();
  if (/^\*?\*?\d+\/\d+/.test(t.replace(/\*\*/g, "")))
    return <ScoreBar text={t} />;
  if (isHeader)
    return <span className="font-semibold text-gray-700 text-xs">{renderInline(t)}</span>;
  return <span className="text-xs text-gray-700 leading-relaxed">{renderInline(t)}</span>;
}

// ─── テーブル ──────────────────────────────────────────────────
function MarkdownTable({ rows }: { rows: string[] }) {
  const parsed = rows.map((row) =>
    row.replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
  );
  const sepIdx = parsed.findIndex((row) => row.every((c) => /^[-:]+$/.test(c)));
  const headers = sepIdx > 0 ? parsed.slice(0, sepIdx) : [];
  const body = sepIdx >= 0 ? parsed.slice(sepIdx + 1) : parsed;

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-left border-collapse">
        {headers.length > 0 && (
          <thead>
            {headers.map((row, ri) => (
              <tr key={ri} className="bg-gray-50 border-b border-gray-200">
                {row.map((cell, ci) => (
                  <th key={ci} className="px-3 py-2 whitespace-nowrap">
                    <TableCell text={cell} isHeader />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
        )}
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className={`border-b border-gray-100 last:border-0 ${ri % 2 === 1 ? "bg-gray-50/40" : "bg-white"}`}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2.5 align-middle">
                  <TableCell text={cell} isHeader={false} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── ブロック型定義 & パース ────────────────────��───────────────
type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "hr" }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; rows: string[] }
  | { type: "text"; text: string }
  | { type: "blank" };

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("# ")) { blocks.push({ type: "h1", text: line.slice(2) }); i++; }
    else if (line.startsWith("## ")) { blocks.push({ type: "h2", text: line.slice(3) }); i++; }
    else if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.slice(4) }); i++; }
    else if (line.startsWith("> ")) { blocks.push({ type: "blockquote", text: line.slice(2) }); i++; }
    else if (/^-{3,}$/.test(line.trim())) { blocks.push({ type: "hr" }); i++; }
    else if (line.startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) { rows.push(lines[i]); i++; }
      blocks.push({ type: "table", rows });
    }
    else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(lines[i].slice(2)); i++;
      }
      blocks.push({ type: "ul", items });
    }
    else if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, "")); i++;
      }
      blocks.push({ type: "ol", items });
    }
    else if (line.trim() === "") { blocks.push({ type: "blank" }); i++; }
    else { blocks.push({ type: "text", text: line }); i++; }
  }

  return blocks;
}

// ─── ブロック → JSX（セクション内で使う）─────────────────────
function renderBlock(block: Block, idx: number): React.ReactNode {
  switch (block.type) {
    case "h3":
      return <h3 key={idx} className="text-sm font-semibold text-gray-800 mt-4 mb-1.5 first:mt-0">{block.text}</h3>;
    case "blockquote":
      return (
        <blockquote key={idx} className="pl-4 border-l-4 border-indigo-300 bg-indigo-50/50 py-2 pr-3 rounded-r-lg my-2">
          <p className="text-sm text-indigo-700 font-medium italic">{block.text}</p>
        </blockquote>
      );
    case "hr":
      return <hr key={idx} className="my-4 border-gray-200" />;
    case "ul":
      return (
        <ul key={idx} className="my-2 space-y-1.5">
          {block.items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={idx} className="my-2 space-y-2">
          {block.items.map((item, j) => (
            <li key={j} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0">
                {j + 1}
              </span>
              <span className="flex-1">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
    case "table":
      return <MarkdownTable key={idx} rows={block.rows} />;
    case "text":
      return <p key={idx} className="text-sm text-gray-700 leading-relaxed">{renderInline(block.text)}</p>;
    case "blank":
      return <div key={idx} className="h-1" />;
    default:
      return null;
  }
}

// ─── セクション設定 ────────────────────────────────────────────
type SectionStyle = {
  headerBg: string;
  headerText: string;
  icon: React.ReactNode;
  isAction?: boolean;
};

function getSectionStyle(heading: string): SectionStyle {
  const h = heading;

  if (h.includes("実現可能性")) return {
    headerBg: "bg-indigo-600", headerText: "text-white",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 003 0v-13A1.5 1.5 0 0015.5 2zM9.5 6A1.5 1.5 0 008 7.5v9a1.5 1.5 0 003 0v-9A1.5 1.5 0 009.5 6zM3.5 10A1.5 1.5 0 002 11.5v5a1.5 1.5 0 003 0v-5A1.5 1.5 0 003.5 10z" />
      </svg>
    ),
  };
  if (h.includes("エグゼクティブ") || h.includes("サマリー")) return {
    headerBg: "bg-emerald-600", headerText: "text-white",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10 1a6 6 0 00-3.815 10.631C7.237 12.5 8 13.443 8 14.456v.644a.75.75 0 00.572.729 6.016 6.016 0 002.856 0A.75.75 0 0012 15.1v-.644c0-1.013.762-1.957 1.815-2.825A6 6 0 0010 1zM8.863 17.414a.75.75 0 00-.226 1.483 9.066 9.066 0 002.726 0 .75.75 0 00-.226-1.483 7.553 7.553 0 01-2.274 0z" />
      </svg>
    ),
  };
  if (h.includes("問題")) return {
    headerBg: "bg-orange-500", headerText: "text-white",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
    ),
  };
  if (h.includes("ソリューション")) return {
    headerBg: "bg-blue-600", headerText: "text-white",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M14.243 5.757a6 6 0 10-.986 9.284 1 1 0 111.087 1.678A8 8 0 1118 10a3 3 0 01-4.8 2.401A4 4 0 1114 10a1 1 0 102 0c0-1.537-.586-2.987-1.757-4.243zM12 10a2 2 0 10-4 0 2 2 0 004 0z" clipRule="evenodd" />
      </svg>
    ),
  };
  if (h.includes("収益")) return {
    headerBg: "bg-green-600", headerText: "text-white",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10.75 10.818v2.614A3.13 3.13 0 0011.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 00-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.33.615z" />
        <path fillRule="evenodd" d="M9.99 2a8 8 0 100 16 8 8 0 000-16zm.75 4.5h-.5v-.75a.75.75 0 00-1.5 0V6.5c-.537.12-1.045.377-1.453.727C6.648 7.79 6.25 8.63 6.25 9.5c0 .98.517 1.819 1.182 2.343.41.334.914.566 1.318.672v2.564c-.291-.06-.558-.169-.782-.327-.456-.316-.668-.729-.668-1.252a.75.75 0 00-1.5 0c0 .966.474 1.792 1.18 2.293A4.503 4.503 0 009.25 16.5v.75a.75.75 0 001.5 0v-.796c.544-.135 1.06-.402 1.479-.757.65-.54 1.021-1.297 1.021-2.197 0-.98-.476-1.793-1.14-2.32a4.567 4.567 0 00-1.36-.682V8.13c.26.074.49.19.675.33.355.27.525.601.525.915a.75.75 0 001.5 0c0-.94-.484-1.754-1.14-2.258A4.502 4.502 0 0010.75 6.5z" clipRule="evenodd" />
      </svg>
    ),
  };
  if (h.includes("GTM") || h.includes("ユーザー獲得")) return {
    headerBg: "bg-teal-600", headerText: "text-white",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
      </svg>
    ),
  };
  if (h.includes("ロードマップ")) return {
    headerBg: "bg-violet-600", headerText: "text-white",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v.258a33.186 33.186 0 016.668.83.75.75 0 01-.336 1.461 31.28 31.28 0 00-1.103-.232l1.702 7.545a.75.75 0 01-.387.832A4.981 4.981 0 0115 14c-.825 0-1.606-.2-2.294-.556a.75.75 0 01-.387-.832l1.77-7.849a31.743 31.743 0 00-3.339-.254v11.505a20.01 20.01 0 013.78.501.75.75 0 11-.339 1.462A18.52 18.52 0 0010 17.5c-1.442 0-2.845.165-4.191.477a.75.75 0 01-.338-1.462 20.01 20.01 0 013.779-.501V5.01c-1.206.05-2.326.167-3.34.255l1.77 7.848a.75.75 0 01-.387.833A4.979 4.979 0 015 14a4.98 4.98 0 01-2.294-.556.75.75 0 01-.387-.832L4.02 5.067c-.37.07-.738.148-1.103.232a.75.75 0 01-.336-1.461 33.186 33.186 0 016.668-.83V2.75A.75.75 0 0110 2z" clipRule="evenodd" />
      </svg>
    ),
  };
  if (h.includes("リスク")) return {
    headerBg: "bg-red-500", headerText: "text-white",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    ),
  };
  if (h.includes("最初の一手") || h.includes("今週")) return {
    headerBg: "bg-amber-500", headerText: "text-white",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
    ),
    isAction: true,
  };

  // デフォルト
  return {
    headerBg: "bg-gray-700", headerText: "text-white",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
      </svg>
    ),
  };
}

// ─── セクションカード ──────────────────────────────────────────
function SectionCard({
  heading,
  content,
}: {
  heading: string;
  content: Block[];
}) {
  const style = getSectionStyle(heading);

  // "今週できる最初の一手" は特別なアクションカードスタイル
  if (style.isAction) {
    return (
      <div className="rounded-2xl border-2 border-amber-400 overflow-hidden shadow-md shadow-amber-100 my-4">
        <div className={`${style.headerBg} px-4 py-3 flex items-center gap-2`}>
          <span className={style.headerText}>{style.icon}</span>
          <h2 className={`text-sm font-bold ${style.headerText}`}>{heading}</h2>
          <span className="ml-auto text-xs text-amber-100 font-medium">今すぐ行動</span>
        </div>
        <div className="p-4 bg-amber-50/40">
          {content.map((b, i) => {
            // olのアイテムをアクションカード形式で表示
            if (b.type === "ol") {
              return (
                <ol key={i} className="space-y-3">
                  {b.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-amber-200 shadow-sm">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {j + 1}
                      </span>
                      <span className="text-sm text-gray-800 leading-relaxed flex-1">{renderInline(item)}</span>
                    </li>
                  ))}
                </ol>
              );
            }
            return renderBlock(b, i);
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm my-4">
      <div className={`${style.headerBg} px-4 py-2.5 flex items-center gap-2`}>
        <span className={style.headerText}>{style.icon}</span>
        <h2 className={`text-sm font-bold ${style.headerText}`}>{heading}</h2>
      </div>
      <div className="p-4 bg-white">
        {content.map((b, i) => renderBlock(b, i))}
      </div>
    </div>
  );
}

// ─── メインエントリ ───────────────────────────────���────────────
export function renderMarkdown(text: string): React.ReactNode {
  const blocks = parseBlocks(text);

  // H2でセクションに分割
  type Section = { heading: string | null; content: Block[] };
  const sections: Section[] = [];
  let current: Section = { heading: null, content: [] };

  for (const block of blocks) {
    if (block.type === "h2") {
      if (current.heading !== null || current.content.length > 0) {
        sections.push(current);
      }
      current = { heading: block.text, content: [] };
    } else {
      current.content.push(block);
    }
  }
  if (current.heading !== null || current.content.length > 0) {
    sections.push(current);
  }

  return (
    <div>
      {sections.map((section, si) => {
        // H2 なし（タイトル・キャッチコピー・フッター）はそのままレンダリング
        if (section.heading === null) {
          return (
            <div key={si} className="mb-2">
              {section.content.map((b, i) => {
                if (b.type === "h1") {
                  return (
                    <h1 key={i} className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
                      {b.text}
                    </h1>
                  );
                }
                return renderBlock(b, i);
              })}
            </div>
          );
        }

        return (
          <SectionCard key={si} heading={section.heading} content={section.content} />
        );
      })}
    </div>
  );
}
