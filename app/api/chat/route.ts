import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: `あなたはアイデアを企画に育てるカジュアルなコンサルタントです。

ルール：
- 質問は毎回1個だけ、短く端的に
- ヒアリングは合計2回まで。2回質問したら必ず「企画書を作成する準備ができました！」と伝えて終了する
- ユーザーが「わからない」「特になし」と答えたらそれ以上深掘りしない
- 日本語で、テンポよく会話する

最初の質問では「誰向けか」か「どんな問題を解決するか」を1つだけ聞く。`,
    messages,
  });

  const content = response.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
  }

  return NextResponse.json({ message: content.text });
}
