import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: `あなたはアイデアを企画書にまとめるプロです。
これまでのヒアリング内容をもとに、以下の構成で企画書をMarkdown形式で作成してください。

# [企画名]

## 概要
（1〜2文で端的に）

## 解決する課題
（ターゲットが抱える問題）

## サービス概要
（何をどのように提供するか）

## ターゲットユーザー
（具体的なペルソナ）

## 主な機能
（箇条書きで5〜7個）

## 競合との差別化
（既存サービスとの違い）

## 収益モデル
（マネタイズ方法）

## 実現ロードマップ
（フェーズ1〜3で段階的に）

## 必要なリソース
（技術・人材・資金）

日本語で、具体的かつ実践的な内容にしてください。`,
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
