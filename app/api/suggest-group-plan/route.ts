import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface CandidateResult {
  name: string;
  description: string;
  budget: string;
  reason: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function extractJson(text: string): string | null {
  const t = text.trim();
  if (t.startsWith("{")) return t;
  const block = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (block) return block[1].trim();
  const idx = t.indexOf("{");
  return idx !== -1 ? t.slice(idx) : null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY が設定されていません" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const { roomId, tags } = body as { roomId: string; tags: string[] };
  if (!roomId) {
    return NextResponse.json({ error: "roomId が必要です" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase が設定されていません" }, { status: 500 });
  }

  const { data: roomData } = await supabase
    .from("rooms")
    .select("location")
    .eq("id", roomId)
    .maybeSingle();
  const roomLocation = (roomData?.location as string | null) ?? null;

  const tagText = tags.length > 0
    ? tags.join("、")
    : "楽しい、みんなで、気軽に楽しめる";

  const locationLine = roomLocation
    ? `会場エリア（必ずこのエリア付近のスポットのみ提案すること）: ${roomLocation}`
    : "";

  const client = new Anthropic({ apiKey });

  const prompt = `
あなたは日本の遊びスポット提案AIです。
グループの投票結果をもとに、おすすめのスポット・アクティビティを3〜4件提案してください。
${locationLine}
グループが選んだ希望（テーマ・エリア・予算など）: ${tagText}

ルール:
- タグの内容（テーマ・エリア・予算）に合った実在する施設・スポットやアクティビティを提案
- 予算タグがある場合はその範囲に収まるスポットを優先する
${roomLocation ? `- 会場エリア「${roomLocation}」付近のスポットを必ず選ぶこと` : "- エリアタグがある場合はそのエリアに合ったスポットを選ぶ"}
- "name" は10文字以内の短い名称（例:「猫カフェ」「カラオケ」「映画館」）
- "budget" は「約○○円」の形式で実際の相場を記載
- "description" は40文字以内でスポットの特徴を説明
- "reason" は30文字以内でタグとの関連性を記載
- 3〜4件のみ返すこと
- JSONのみ出力し、余計な説明は不要

出力形式:
{
  "candidates": [
    {
      "name": "スポット名",
      "budget": "約○○円",
      "description": "説明",
      "reason": "理由"
    }
  ]
}
`;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonStr = extractJson(raw) ?? raw;
      const data = JSON.parse(jsonStr) as { candidates: CandidateResult[] };

      if (!Array.isArray(data.candidates) || data.candidates.length === 0) {
        throw new Error("不正なレスポンス形式");
      }

      const candidates = data.candidates.slice(0, 4).map((c) => ({
        room_id: roomId,
        name: c.name.slice(0, 10),
        description: c.description,
        budget: c.budget,
        reason: c.reason,
      }));

      const { error: insertErr } = await supabase.from("room_candidates").insert(candidates);
      if (insertErr) {
        return NextResponse.json({ error: "候補の保存に失敗しました" }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    } catch (err) {
      lastError = err;
      if ((err as { status?: number })?.status === 429) break;
    }
  }

  const is429 = (lastError as { status?: number })?.status === 429;
  return NextResponse.json(
    { error: is429 ? "AIの1日の利用上限に達しました。時間をおいてから再試行してください🙏" : "AI提案の生成に失敗しました。しばらく経ってから再試行してください。" },
    { status: is429 ? 429 : 502 }
  );
}
