import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: `あなたはアイデアを企画書にまとめるプロです。
ヒアリング内容をもとに、以下の構成で簡潔な企画書をMarkdown形式で作成してください。
各セクションは2〜4行程度にまとめること。

# [企画名]

## 概要
（1〜2文）

## ターゲットと課題
（誰の・どんな問題を解決するか）

## サービス内容
（何をどう提供するか・主な機能を箇条書き3〜4個）

## 差別化ポイント
（既存サービスとの違いを1〜2点）

## 収益モデル
（マネタイズ方法を端的に）

## 最初の一歩
（まず何から始めるか）

情報が不足している箇所は合理的に補完してよい。冗長にならず読みやすくまとめること。`,
    messages: [
      ...messages,
      {
        role: "user",
        content: "これまでのヒアリング内容をもとに企画書を作成してください。",
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
  }

  return NextResponse.json({ document: content.text });
}
