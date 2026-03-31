import React from "react";

// ── インライン装飾（太字・イタリック）──────────────────────────
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i} className="italic text-gray-500">{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── スコアバー（█）を色付きバーに変換 ────────────────────────
function renderScoreBar(text: string): React.ReactNode {
  // "3/5 ███░░" or "25/25 (80%)" のようなパターンを検出
  const scoreMatch = text.match(/^(\d+)\/(\d+)\s*(█+░*)?/);
  if (!scoreMatch) return renderInline(text);

  const current = parseInt(scoreMatch[1]);
  const max = parseInt(scoreMatch[2]);
  const pct = Math.round((current / max) * 100);

  const color =
    pct >= 80 ? "bg-emerald-500" :
    pct >= 60 ? "bg-indigo-500" :
    pct >= 40 ? "bg-amber-500" :
    "bg-red-400";

  const rest = text.replace(/^\d+\/\d+\s*█*░*/, "").trim();

  return (
    <span className="flex items-center gap-2 min-w-[140px]">
      <span className="w-5 text-right text-xs font-bold text-gray-700">{current}/{max}</span>
      <span className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <span className={`block h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </span>
      {rest && <span className="text-xs text-gray-500 whitespace-nowrap">{rest}</span>}
    </span>
  );
}

// ── テーブルセルのレンダリング ────────────────────────────────
function renderCell(text: string, isHeader: boolean): React.ReactNode {
  const trimmed = text.trim();

  // スコアパターン
  if (/^\*?\*?\d+\/\d+/.test(trimmed.replace(/\*\*/g, ""))) {
    return renderScoreBar(trimmed.replace(/\*\*/g, ""));
  }

  // 総合スコア（太字 + パーセント）
  if (isHeader) {
    return <span className="font-semibold text-gray-900 text-xs">{renderInline(trimmed)}</span>;
  }

  return <span className="text-xs text-gray-700">{renderInline(trimmed)}</span>;
}

// ── テーブルのパース & レンダリング ──────────────────────────
function renderTable(rows: string[], key: number): React.ReactNode {
  const parsed = rows.map((row) =>
    row
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim())
  );

  // セパレーター行（|---|---|）を除去して header/body を分離
  const sepIdx = parsed.findIndex((row) =>
    row.every((cell) => /^[-:]+$/.test(cell))
  );

  const headerRows = sepIdx > 0 ? parsed.slice(0, sepIdx) : [];
  const bodyRows = sepIdx >= 0 ? parsed.slice(sepIdx + 1) : parsed;

  const isScoreTable = rows.some((r) => r.includes("評価軸") || r.includes("スコア") || r.includes("総合"));

  return (
    <div key={key} className="my-4 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-left border-collapse">
        {headerRows.length > 0 && (
          <thead>
            {headerRows.map((row, ri) => (
              <tr key={ri} className={isScoreTable ? "bg-indigo-50" : "bg-gray-50"}>
                {row.map((cell, ci) => (
                  <th
                    key={ci}
                    className="px-3 py-2.5 text-xs font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap"
                  >
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
        )}
        <tbody>
          {bodyRows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
              {row.map((cell, ci) => {
                const isBold = cell.startsWith("**") && cell.endsWith("**");
                return (
                  <td
                    key={ci}
                    className={`px-3 py-2.5 border-b border-gray-100 align-middle ${
                      isBold ? "font-semibold text-gray-900" : ""
                    } ${ci === 0 ? "whitespace-nowrap" : ""}`}
                  >
                    {renderCell(cell, isBold)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── ブロック分類 ───────────────────────────────────────────────
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

    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2) });
      i++;
    } else if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3) });
      i++;
    } else if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4) });
      i++;
    } else if (line.startsWith("> ")) {
      blocks.push({ type: "blockquote", text: line.slice(2) });
      i++;
    } else if (/^[-]{3,}$/.test(line.trim()) && line.trim() !== "- ") {
      blocks.push({ type: "hr" });
      i++;
    } else if (line.startsWith("|")) {
      // テーブルブロックを収集
      const tableRows: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableRows.push(lines[i]);
        i++;
      }
      blocks.push({ type: "table", rows: tableRows });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: "ul", items });
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
    } else if (line.trim() === "") {
      blocks.push({ type: "blank" });
      i++;
    } else {
      blocks.push({ type: "text", text: line });
      i++;
    }
  }

  return blocks;
}

// ── メインレンダラー ──────────────────────────────────────────
export function renderMarkdown(text: string): React.ReactNode[] {
  const blocks = parseBlocks(text);

  return blocks.map((block, idx) => {
    switch (block.type) {
      case "h1":
        return (
          <h1 key={idx} className="text-2xl font-bold text-gray-900 mt-2 mb-1 tracking-tight">
            {block.text}
          </h1>
        );

      case "h2":
        return (
          <h2
            key={idx}
            className="text-base font-bold text-indigo-700 mt-7 mb-3 pb-1.5 border-b-2 border-indigo-100 first:mt-0 flex items-center gap-2"
          >
            {block.text}
          </h2>
        );

      case "h3":
        return (
          <h3 key={idx} className="text-sm font-semibold text-gray-800 mt-4 mb-2">
            {block.text}
          </h3>
        );

      case "blockquote":
        return (
          <blockquote
            key={idx}
            className="my-3 pl-4 border-l-4 border-indigo-300 bg-indigo-50/50 py-2 pr-3 rounded-r-lg"
          >
            <p className="text-sm text-indigo-700 font-medium italic">{block.text}</p>
          </blockquote>
        );

      case "hr":
        return <hr key={idx} className="my-6 border-gray-200" />;

      case "ul":
        return (
          <ul key={idx} className="my-2 space-y-1.5 pl-1">
            {block.items.map((item, j) => (
              <li key={j} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                <span>{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        );

      case "ol":
        return (
          <ol key={idx} className="my-2 space-y-2 pl-1">
            {block.items.map((item, j) => (
              <li key={j} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {j + 1}
                </span>
                <span className="flex-1">{renderInline(item)}</span>
              </li>
            ))}
          </ol>
        );

      case "table":
        return renderTable(block.rows, idx);

      case "text":
        return (
          <p key={idx} className="text-sm text-gray-700 leading-relaxed">
            {renderInline(block.text)}
          </p>
        );

      case "blank":
        return <div key={idx} className="h-1" />;

      default:
        return null;
    }
  });
}
