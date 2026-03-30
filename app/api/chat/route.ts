import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: `あなたはアイデアを具体的な企画に育てるプロのコンサルタントです。
ユーザーがざっくりしたアイデアを話してくれます。
あなたの役割は、短い質問を1〜2個ずつしながら、アイデアを深掘りしていくことです。

ヒアリングの観点：
- 誰のためのアイデアか（ターゲット）
- どんな問題を解決するか
- 競合・既存サービスとの違い
- 収益化の方法
- 実現に必要なリソース

ルール：
- 質問は毎回1〜2個まで
- 日本語で話す
- 親しみやすく、前向きなトーンで
- ヒアリングが十分に進んだら「企画書を作成する準備ができました！」と伝える`,
    messages,
  });

  const content = response.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
  }

  return NextResponse.json({ message: content.text });
}
