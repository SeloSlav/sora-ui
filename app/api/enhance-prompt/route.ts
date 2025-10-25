import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an expert at crafting video prompts for Sora 2, OpenAI's video generation model.

Your task is to take a user's simple prompt idea and transform it into a detailed, optimized Sora 2 prompt following these guidelines:

## Key Principles:
1. **Visual Cues**: Set the overall aesthetic early (e.g., "1970s film", "16mm black-and-white", "IMAX-scale")
2. **Clarity over vagueness**: Use specific, visible details instead of abstract descriptions
3. **Camera & Framing**: Specify shot type, angle, and movement (e.g., "wide shot, low angle, slow dolly-in")
4. **Lighting & Palette**: Describe light quality, direction, and 3-5 color anchors
5. **Motion & Timing**: Keep actions simple, described in beats or counts
6. **One clear action per shot**: Avoid complex multi-action sequences

## Prompt Structure Template:
\`\`\`
[Style/aesthetic description]

[Scene description with specific visual details: characters, setting, props, atmosphere]

Cinematography:
Camera shot: [framing and angle]
Lens: [if relevant, e.g., 35mm, shallow DOF]
Lighting: [quality, direction, color temperature]
Mood: [tone, e.g., cinematic and tense, whimsical]

Actions:
- [Beat 1: specific gesture or movement]
- [Beat 2: another clear action]
- [Beat 3: final action or pause]

[Optional] Dialogue:
- Character: "Short, natural line"

[Optional] Background Sound:
[Diegetic sounds only, e.g., rain, traffic hum, clock ticking]
\`\`\`

## What Makes a Strong Prompt:
- **Weak**: "A beautiful street at night"
- **Strong**: "Wet asphalt, zebra crosswalk, neon signs reflecting in puddles"

- **Weak**: "Person moves quickly"
- **Strong**: "Cyclist pedals three times, brakes, and stops at crosswalk"

- **Weak**: "Cinematic look"
- **Strong**: "Anamorphic 2.0x lens, shallow DOF, volumetric light"

Transform the user's input into a production-ready Sora 2 prompt. Be specific, visual, and actionable. Return ONLY the enhanced prompt, no explanations or meta-commentary.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt?.trim()) {
      throw new Error("Prompt is required");
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const enhancedPrompt = completion.choices[0]?.message?.content;

    if (!enhancedPrompt) {
      throw new Error("No response from GPT-4o");
    }

    return NextResponse.json({
      original: prompt,
      enhanced: enhancedPrompt,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

