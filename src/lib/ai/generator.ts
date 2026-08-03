import "server-only";
import { generateWithDeepSeek } from "@/lib/ai/deepseek";
import { guardViolation } from "@/lib/ai/guard";
import { fallbackPhrase, type CareProfile, type Phase, type Mood } from "@/lib/fallback";
import { SOS_SYSTEM_PROMPT, SOS_FALLBACK } from "@/lib/ai/prompts";

export interface PromptContext {
  phase: Phase;
  mood: Mood;
  careProfile: CareProfile;
  locale: "ru" | "en";
  dayTogether: number;
  recentFeedback: string[]; // GOOD | BAD | MISSED за последние дни
  partnerContext?: string; // стиль партнёра из микро-опроса
}

export interface PromptResult {
  text: string;
  source: "AI" | "FALLBACK";
}

export interface SosResult {
  phrase: string;
  action: string;
  passwordPhrase: string;
  source: "AI" | "FALLBACK";
}

// Оркестратор: DeepSeek (если ключ есть) → guard → регенерация → фолбэк.
// Экономия: одна генерация на пару в день (кэш в DailyPrompt) + max_tokens 180.
export async function generatePrompt(ctx: PromptContext): Promise<PromptResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.AI_MODEL ?? "deepseek-v4-flash";

  if (!apiKey) {
    return {
      text: fallbackPhrase(ctx.phase, ctx.mood, ctx.careProfile, ctx.locale),
      source: "FALLBACK",
    };
  }

  let text = await generateWithDeepSeek(ctx, apiKey, model);
  if (text && !guardViolation(text)) {
    return { text, source: "AI" };
  }

  // регенерация со строгим промптом
  text = await generateWithDeepSeek(ctx, apiKey, model, true);
  if (text && !guardViolation(text)) {
    return { text, source: "AI" };
  }

  return {
    text: fallbackPhrase(ctx.phase, ctx.mood, ctx.careProfile, ctx.locale, Date.now()),
    source: "FALLBACK",
  };
}

// SOS: срочный план «я накосячил» (3 в день на пользователя — лимит в /api/sos).
export async function generateSos(
  type: keyof typeof SOS_FALLBACK,
  careProfile: CareProfile,
  locale: "ru" | "en"
): Promise<SosResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.AI_MODEL ?? "deepseek-v4-flash";
  const fallback = SOS_FALLBACK[type] ?? SOS_FALLBACK.unknown;

  if (!apiKey) return { ...fallback, source: "FALLBACK" };

  const userPrompt = JSON.stringify({
    situation: type,
    careProfile,
    locale,
  });

  try {
    const res = await generateWithDeepSeekRaw(userPrompt, SOS_SYSTEM_PROMPT, apiKey, model);
    const parsed = JSON.parse(res ?? "");
    const phrase = String(parsed.phrase ?? "").trim();
    const action = String(parsed.action ?? "").trim();
    if (phrase.length >= 10 && action.length >= 5) {
      return {
        phrase,
        action,
        passwordPhrase: String(parsed.passwordPhrase ?? "").trim(),
        source: "AI",
      };
    }
  } catch {
    // молча уходим в фолбэк
  }

  return { ...fallback, source: "FALLBACK" };
}

// прямой вызов без оркестрации карточки (для SOS)
async function generateWithDeepSeekRaw(
  userPrompt: string,
  systemPrompt: string,
  apiKey: string,
  model: string
): Promise<string | null> {
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        thinking: { type: "disabled" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 220,
        temperature: 0.7,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    const match = content.match(/\{[\s\S]*\}/);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}
