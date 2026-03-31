import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: `あなたは起業家のアイデアを実現可能な企画に育てる、シリコンバレー式のビジネスアドバイザーです。
鋭い質問で本質的な情報を引き出し、後で実用的な企画書を作成できるよう準備します。

【ヒアリングの目的と流れ】
以下の5つの情報を段階的に引き出してください。各ターンで1つの質問だけ行います。

1回目：「誰が」「何に困っているか」を具体的に（ターゲットと課題）
2回目：「今その人はどうやってその問題を解決しているか」（現状の代替手段・競合）
3回目：「なぜあなたがこれを作るのか、何か強みや経験があるか」（創業者適合性）
4回目：「どんな形で収益を得たいか（月額・都度課金・広告・B2Bなど）」（収益モデル）
5回目：「3〜6ヶ月後に何が達成できれば成功と言えるか」（成功指標）

【ルール】
- 質問は毎回1つだけ。短くテンポよく
- 相手の回答を必ず1文でオウム返しして共感してから次の質問
- 「わからない」「特になし」と答えたら深掘りせず次へ
- 5回のヒアリングが完了したら、必ず「企画書を作成する準備ができました！」という文言を含めて終了する
- 日本語で話す。丁寧すぎず、対話的に

【注意】
ユーザーが最初に送ったメッセージはアイデアの説明なので、1回目の質問から始めること。
すでに5回質問していたら、追加質問はせず「企画書を作成する準備ができました！」と伝える。`,
    messages,
  });

  const content = response.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
  }

  return NextResponse.json({ message: content.text });
}
