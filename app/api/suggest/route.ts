import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { Suggestion } from "@/types/planco";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY が設定されていません" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const { peopleCount, budget, theme, location } = body as {
    peopleCount: string;
    budget: string;
    theme: string;
    location: string;
  };

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
あなたは日本の遊びスポット提案AIです。
以下の条件に合う実在する施設・スポットやアクティビティを5件提案してください。

条件:
- 人数: ${peopleCount}
- 予算（1人あたり）: ${budget}
- テーマ: ${theme}
- エリア: ${location || "日本全国（都市部）"}

ルール:
- "name" はルーレットに収まる10文字以内の短い名称にすること（例: 「猫カフェ」「カラオケ」「映画館」）
- "budget" は「約○○円」の形式で実際の相場を記載
- "description" は40文字以内でスポットの特徴を説明
- "reason" は30文字以内でなぜおすすめかを記載
- 5件のみ返すこと
- JSONのみ出力し、余計な説明は不要

出力形式:
{
  "suggestions": [
    {
      "id": "1",
      "name": "スポット名",
      "budget": "約○○円",
      "description": "説明文",
      "reason": "おすすめ理由"
    }
  ]
}
`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const text = result.text ?? "";
    const data = JSON.parse(text) as { suggestions: Suggestion[] };

    if (!Array.isArray(data.suggestions) || data.suggestions.length === 0) {
      throw new Error("不正なレスポンス形式");
    }

    // nameを10文字にトリム（念のため）
    data.suggestions = data.suggestions.slice(0, 5).map((s, i) => ({
      ...s,
      id: String(i + 1),
      name: s.name.slice(0, 10),
    }));

    return NextResponse.json(data);
  } catch (err) {
    console.error("Gemini API error:", err);
    return NextResponse.json({ error: "AI提案の生成に失敗しました。しばらく経ってから再試行してください。" }, { status: 502 });
  }
}
