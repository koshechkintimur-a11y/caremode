import "server-only";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts";
import type { PromptContext } from "@/lib/ai/generator";

// Прямой вызов DeepSeek. Один запрос = одна карточка дня (кэшируется в БД).
const ENDPOINT = "https://api.deepseek.com/chat/completions";
const TIMEOUT_MS = 15_000;

export async function generateWithDeepSeek(
  ctx: PromptContext,
  apiKey: string,
  model: string,
  strict: boolean = false
): Promise<string | null> {
  const base = strict
    ? SYSTEM_PROMPT[ctx.locale] +
      "\n\nДОПОЛНИТЕЛЬНО: предыдущий вариант нарушил правила. Будь максимально осторожен с тоном: тепло, конкретно, без единой шутки о ней."
    : SYSTEM_PROMPT[ctx.locale];

  // Few-shot: учимся на реальных реакциях пары (2 GOOD — образец стиля, 1 BAD — чего избегать)
  const goodShots = ctx.recentFeedback
    .filter((f) => f.feedback === "GOOD" && f.text)
    .slice(-2)
    .map((f) => `✅ Работало: «${f.text}»`)
    .join("\n");
  const badShots = ctx.recentFeedback
    .filter((f) => f.feedback === "BAD" && f.text)
    .slice(-1)
    .map((f) => `❌ Не повторяй: «${f.text}»`)
    .join("\n");
  const shots = [goodShots, badShots].filter(Boolean).join("\n");

  const system = [
    base,
    ctx.partnerContext ? `\n\n## Стиль партнёра (учитывай в совете)\n${ctx.partnerContext}` : "",
    shots ? `\n\n## Что уже пробовали (учись на этом)\n${shots}` : "",
  ].join("");

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        // deepseek-v4-flash — думающая модель: без отключения reasoning
        // все токены уходят в «размышления» и content пустой
        thinking: { type: "disabled" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(ctx) },
        ],
        max_tokens: 180,
        temperature: 0.85,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    if (!content) return null;

    try {
      const parsed = JSON.parse(content);
      const text = String(parsed?.text ?? "").trim();
      return text.length >= 10 ? text : null;
    } catch {
      // модель вернула не-JSON — пробуем взять сырой текст
      const raw = content.trim();
      return raw.length >= 10 ? raw : null;
    }
  } catch {
    return null; // таймаут/сеть — тихо уходим в фолбэк
  }
}
