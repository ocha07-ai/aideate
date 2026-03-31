import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ConversationMessage = { role: "user" | "assistant"; content: string };

// Step 1: ヒアリング内容を構造化データに変換
async function analyzeConversation(messages: ConversationMessage[]) {
  const transcript = messages
    .map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.content}`)
    .join("\n");

  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: `ヒアリングの会話記録を分析し、以下のJSON形式で構造化データを出力してください。
値が不明な場合は null にせず、会話から推測して記入すること。

{
  "ideaTitle": "アイデアの仮称（自分で考えて命名）",
  "category": "SaaS | モバイルアプリ | マーケットプレイス | コミュニティ | EC | コンテンツ | ハードウェア | その他",
  "targetUser": {
    "primary": "主なターゲット層",
    "persona": "具体的なペルソナ（年齢・職業・状況）",
    "painLevel": 1-5（1=軽微、5=切実）
  },
  "problem": {
    "core": "核心的な課題（1文）",
    "currentWorkaround": "現状の解決手段",
    "whyCurrentFails": "現状手段の何が不十分か"
  },
  "solution": {
    "concept": "ソリューションの概念",
    "keyFeatures": ["機能1", "機能2", "機能3"]
  },
  "competition": {
    "directCompetitors": ["競合1", "競合2"],
    "differentiator": "差別化ポイント"
  },
  "founder": {
    "relevantExperience": "創業者の関連経験・強み",
    "fitScore": 1-5（1=不明、5=完璧な適合）
  },
  "revenue": {
    "model": "収益モデル（月額SaaS/都度課金/フリーミアム/広告/B2B/マーケットプレイス手数料）",
    "targetPrice": "想定価格帯",
    "primaryCustomer": "誰が払うか（BtoC/BtoB/BtoG）"
  },
  "successMetrics": {
    "shortTerm": "3〜6ヶ月の目標",
    "kpi": "主要KPI"
  },
  "viabilityScores": {
    "marketSize": 1-5（市場の大きさ・成長性）,
    "painSeverity": 1-5（課題の深刻さ・緊急性）,
    "competitiveEdge": 1-5（競合優位性の明確さ）,
    "monetizationClarity": 1-5（収益化の明確さ・容易さ）,
    "founderFit": 1-5（創業者適合性）,
    "reasoning": {
      "marketSize": "スコア根拠",
      "painSeverity": "スコア根拠",
      "competitiveEdge": "スコア根拠",
      "monetizationClarity": "スコア根拠",
      "founderFit": "スコア根拠"
    }
  }
}

JSONのみ出力すること。説明文不要。`,
    messages: [
      {
        role: "user",
        content: `以下のヒアリング会話を分析してください：\n\n${transcript}`,
      },
    ],
  });

  const text = res.content[0];
  if (text.type !== "text") throw new Error("Analysis failed");

  // JSON部分を抽出
  const jsonMatch = text.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found");

  return JSON.parse(jsonMatch[0]);
}

// Step 2: 構造化データから深い企画書を生成
async function generateProposal(analysis: Record<string, unknown>) {
  const totalScore = Object.values(
    (analysis.viabilityScores as Record<string, unknown>)
  )
    .filter((v) => typeof v === "number")
    .reduce((sum: number, v) => sum + (v as number), 0) as number;

  const maxScore = 25;
  const scorePercent = Math.round((totalScore / maxScore) * 100);

  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: `あなたは一流のビジネスコンサルタントです。
提供された構造化分析データをもとに、投資家や経営陣が読んでも納得できる、実行可能で具体的な企画書を作成してください。

【重要な制約】
- 抽象的な表現を避け、数字・固有名詞・具体的アクションを使う
- 「〜する可能性があります」などの曖昧表現禁止。断言する
- 各セクションは実際に使える内容にする（コピペで行動できるレベル）
- 競合比較は実在するサービス名を挙げて比較する
- 収益試算は保守的シナリオと楽観的シナリオを両方示す
- ロードマップは週単位・月単位で具体的なタスクまで落とす

【文体】
Markdownで出力。日本語。見出しは簡潔に。`,
    messages: [
      {
        role: "user",
        content: `以下の分析データをもとに企画書を作成してください。

【分析データ】
${JSON.stringify(analysis, null, 2)}

【実現可能性総合スコア】
${totalScore}/${maxScore}点 (${scorePercent}%)

以下の構成で企画書を作成してください：

# ${(analysis as Record<string, string>).ideaTitle}

> [1行のキャッチコピー]

## 実現可能性スコア

以下の5軸を棒グラフ風に表現（█で5段階）：

| 評価軸 | スコア | 根拠 |
|--------|--------|------|
| 市場規模 | [スコア]/5 █████ | [根拠] |
| 課題の深刻さ | [スコア]/5 | [根拠] |
| 競合優位性 | [スコア]/5 | [根拠] |
| 収益化容易性 | [スコア]/5 | [根拠] |
| 創業者適合性 | [スコア]/5 | [根拠] |
| **総合** | **[合計]/25 (${scorePercent}%)** | [総評] |

## エグゼクティブサマリー

[3文：①何をするか ②なぜ今か ③どう勝つか]

## 問題定義

### ターゲットペルソナ
[具体的な人物像：年齢・職業・状況・1日の行動パターン]

### 解決する課題
[課題の深刻さを定量的に。「〜人が〜に月〜時間/〜円を無駄にしている」形式]

### 現状の代替手段とその限界
| 代替手段 | 使っている理由 | 何が足りないか |
|---------|--------------|--------------|
| [手段1] | [理由] | [限界] |
| [手段2] | [理由] | [限界] |

## ソリューション

### コアコンセプト
[ソリューションの本質を1文で]

### 主要機能（MVP）
1. **[機能1]** — [なぜこれが重要か・期待効果]
2. **[機能2]** — [なぜこれが重要か・期待効果]
3. **[機能3]** — [なぜこれが重要か・期待効果]

### 競合比較
| サービス名 | 強み | 弱み | 本サービスのアドバンテージ |
|-----------|------|------|--------------------------|
| [競合1] | | | |
| [競合2] | | | |
| **本サービス** | | | — |

## 収益モデル

### 基本モデル：[収益モデル名]

**価格設定の根拠**
[なぜその価格か。競合比較・顧客の代替コスト・WTP（支払意思額）から導出]

### 収益試算（月次）

| シナリオ | ユーザー数 | ARPU | MRR | ARR |
|---------|-----------|------|-----|-----|
| 保守的（6ヶ月後） | | | | |
| 標準的（12ヶ月後） | | | | |
| 楽観的（18ヶ月後） | | | | |

### 将来の収益拡大オプション
1. [オプション1]
2. [オプション2]

## 初期ユーザー獲得戦略（GTM）

### Phase 0：0→最初の10人（〜1ヶ月）
[具体的なアクション。チャンネル・メッセージ・どこで誰に声をかけるか]

### Phase 1：10→100人（1〜3ヶ月）
[スケールさせる方法。口コミ・コミュニティ・コンテンツ等]

### Phase 2：100→1,000人（3〜12ヶ月）
[成長エンジン。有料広告・パートナー・SEO等]

## フェーズ別ロードマップ

### Month 0-1：検証フェーズ
- Week 1：[具体的タスク]
- Week 2：[具体的タスク]
- Week 3-4：[具体的タスク]
- 達成目標：[KPI]

### Month 2-3：MVP開発・ローンチ
- [主要タスク群]
- 達成目標：[KPI]

### Month 4-6：グロース
- [主要タスク群]
- 達成目標：[KPI]

### Month 7-12：スケール
- [主要タスク群]
- 達成目標：[KPI]

## リスクと対策

| リスク | 発生確率 | 影響度 | 対策 |
|--------|---------|--------|------|
| [リスク1] | 高/中/低 | 高/中/低 | [具体的対策] |
| [リスク2] | 高/中/低 | 高/中/低 | [具体的対策] |
| [リスク3] | 高/中/低 | 高/中/低 | [具体的対策] |

## 今週できる最初の一手

1. **[アクション1]**（所要時間：〜時間）— [なぜこれが最優先か]
2. **[アクション2]**（所要時間：〜時間）— [期待する学び]
3. **[アクション3]**（所要時間：〜時間）— [期待する成果]

---
*Generated by AIdeate — スコア: ${scorePercent}%*`,
      },
    ],
  });

  const content = res.content[0];
  if (content.type !== "text") throw new Error("Generation failed");
  return content.text;
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  try {
    // Step 1: 会話を構造化分析
    const analysis = await analyzeConversation(messages);

    // Step 2: 深い企画書を生成
    const document = await generateProposal(analysis);

    return NextResponse.json({ document, analysis });
  } catch (err) {
    console.error("Generation error:", err);
    return NextResponse.json(
      { error: "企画書の生成に失敗しました" },
      { status: 500 }
    );
  }
}
