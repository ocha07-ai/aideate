import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function POST(req: NextRequest) {
  const { content, idea, sessionId } = await req.json();

  if (!content || !sessionId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const titleMatch = content.match(/^# (.+)/m);
  const title = titleMatch ? titleMatch[1] : "無題の企画書";

  const { data, error } = await supabase
    .from("proposals")
    .insert({ title, content, idea, session_id: sessionId })
    .select("id, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, createdAt: data.created_at });
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("proposals")
    .select("id, title, idea, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proposals: data });
}
