/**
 * Mistral vision adapter — reads an image and returns structured JSON.
 * Vendor HTTP stays in providers/; never import this elsewhere than a service.
 *
 * The configured MISTRAL_MODEL is usually a text model (mistral-large), which
 * cannot see images, so vision calls pin a Pixtral model explicitly. Defaults
 * to the small, inexpensive Pixtral (a single size-table image costs a
 * fraction of a cent); override with MISTRAL_VISION_MODEL for more accuracy.
 */

const VISION_MODEL = process.env.MISTRAL_VISION_MODEL ?? "pixtral-12b-latest";

export type MistralVisionInput = {
  apiKey: string;
  baseUrl?: string;
  /** data URL: `data:image/png;base64,....` */
  imageDataUrl: string;
  systemPrompt: string;
  userPrompt: string;
};

export async function mistralVisionJson<T>(
  input: MistralVisionInput,
): Promise<T> {
  const base = (input.baseUrl ?? "https://api.mistral.ai/v1").replace(/\/$/, "");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: input.userPrompt },
            { type: "image_url", image_url: input.imageDataUrl },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Mistral vision failed: ${response.status}${detail ? ` — ${detail.slice(0, 200)}` : ""}`,
    );
  }

  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = body.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Mistral vision returned empty content");

  try {
    return JSON.parse(raw) as T;
  } catch {
    // Some models wrap JSON in ```json fences despite json_object mode.
    const fenced = raw.match(/\{[\s\S]*\}/);
    if (fenced) return JSON.parse(fenced[0]) as T;
    throw new Error("Mistral vision returned non-JSON content");
  }
}
