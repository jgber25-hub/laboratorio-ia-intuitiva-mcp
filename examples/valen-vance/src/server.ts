import { createWorkersAI } from "workers-ai-provider";
import { callable, routeAgentRequest } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import {
  convertToModelMessages,
  isStepCount,
  pruneMessages,
  streamText,
  tool
} from "ai";
import { z } from "zod";
import {
  DEFAULT_STATE,
  isContentPillar,
  isValidValenState,
  isVibeMode,
  MODEL,
  PILLAR_LABELS,
  VIBE_LABELS,
  type ContentPillar,
  type SavedDrop,
  type ValenState,
  type VibeMode
} from "./shared";

export class ValenVanceAgent extends AIChatAgent<Env, ValenState> {
  maxPersistedMessages = 200;
  initialState = DEFAULT_STATE;

  validateStateChange(next: ValenState) {
    if (!isValidValenState(next)) {
      throw new Error("Invalid Valen Vance agent state");
    }
  }

  @callable()
  async setPillar(pillar: ContentPillar): Promise<ValenState> {
    if (!isContentPillar(pillar)) {
      throw new Error(`Unsupported content pillar: ${String(pillar)}`);
    }
    const next: ValenState = {
      ...this.state,
      activePillar: pillar
    };
    this.setState(next);
    return next;
  }

  @callable()
  async setVibe(vibe: VibeMode): Promise<ValenState> {
    if (!isVibeMode(vibe)) {
      throw new Error(`Unsupported vibe mode: ${String(vibe)}`);
    }
    const next: ValenState = {
      ...this.state,
      vibe
    };
    this.setState(next);
    return next;
  }

  @callable()
  async removeSavedDrop(id: string): Promise<ValenState> {
    const next: ValenState = {
      ...this.state,
      savedDrops: this.state.savedDrops.filter((drop) => drop.id !== id)
    };
    this.setState(next);
    return next;
  }

  @callable()
  async clearSavedDrops(): Promise<ValenState> {
    const next: ValenState = {
      ...this.state,
      savedDrops: []
    };
    this.setState(next);
    return next;
  }

  private appendDrop(drop: Omit<SavedDrop, "id" | "createdAt">): SavedDrop {
    const entry: SavedDrop = {
      ...drop,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    const next: ValenState = {
      ...this.state,
      savedDrops: [entry, ...this.state.savedDrops].slice(0, 24)
    };
    this.setState(next);
    return entry;
  }

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const tools = {
      saveViralHook: tool({
        description:
          "Save a magnetic 2-second social media opening hook and its visual cue to Valen's persistent studio vault.",
        inputSchema: z.object({
          topic: z.string().describe("Topic or angle of the hook"),
          hook: z
            .string()
            .describe("Exact opening line spoken or shown in the first 2s"),
          visualCue: z
            .string()
            .describe("Lighting, framing, or movement cue in the shot")
        }),
        execute: async ({ topic, hook, visualCue }) => {
          const saved = this.appendDrop({
            kind: "hook",
            title: topic,
            content: `"${hook}" — Shot cue: ${visualCue}`
          });
          return {
            savedId: saved.id,
            topic,
            hook,
            visualCue
          };
        }
      }),

      saveMicroVlogScript: tool({
        description:
          "Save a 30-second cinematic micro-vlog storyboard with audio cues, visual beats, and closing line.",
        inputSchema: z.object({
          title: z.string().describe("Short title for the micro-vlog"),
          location: z
            .string()
            .describe("Setting, e.g., late-night café or city rooftop"),
          soundtrackCue: z
            .string()
            .describe("Ambient sound or music bed for the clip"),
          beats: z
            .array(z.string())
            .min(2)
            .max(5)
            .describe("Ordered 5-10 second scene beats with voiceover lines"),
          closingLine: z
            .string()
            .describe("Intimate closing whisper or line to camera")
        }),
        execute: async ({
          title,
          location,
          soundtrackCue,
          beats,
          closingLine
        }) => {
          const formatted = [
            `Location: ${location}`,
            `Audio: ${soundtrackCue}`,
            ...beats.map((beat, idx) => `${idx + 1}. ${beat}`),
            `Close: "${closingLine}"`
          ].join("\n");
          const saved = this.appendDrop({
            kind: "micro-vlog",
            title,
            content: formatted
          });
          return {
            savedId: saved.id,
            title,
            location,
            soundtrackCue,
            beats,
            closingLine
          };
        }
      }),

      saveHotTake: tool({
        description:
          "Save an elegant, calm, debate-sparking hot take along with a complicity prompt for comments.",
        inputSchema: z.object({
          title: z.string().describe("Short label for the hot take"),
          statement: z
            .string()
            .describe("The crisp, confident opinion delivered to camera"),
          complicityPrompt: z
            .string()
            .describe(
              "A closing question that invites followers to reply as insiders"
            )
        }),
        execute: async ({ title, statement, complicityPrompt }) => {
          const saved = this.appendDrop({
            kind: "hot-take",
            title,
            content: `${statement}\n\nPrompt: ${complicityPrompt}`
          });
          return {
            savedId: saved.id,
            title,
            statement,
            complicityPrompt
          };
        }
      }),

      updateSignatureDetail: tool({
        description:
          "Update Valen Vance's active signature aesthetic detail (wardrobe cue, fragrance, accessory, or recurring sign-off) in durable agent state.",
        inputSchema: z.object({
          detail: z
            .string()
            .describe("New signature detail or recurring creative motif")
        }),
        execute: async ({ detail }) => {
          const entry: SavedDrop = {
            id: crypto.randomUUID(),
            kind: "signature",
            title: "Signature Detail Updated",
            content: detail,
            createdAt: new Date().toISOString()
          };
          this.setState({
            ...this.state,
            signatureDetail: detail,
            savedDrops: [entry, ...this.state.savedDrops].slice(0, 24)
          });
          return {
            signatureDetail: detail,
            savedId: entry.id
          };
        }
      })
    };

    const result = streamText({
      abortSignal: options?.abortSignal,
      model: workersai(MODEL, {
        sessionAffinity: this.sessionAffinity
      }),
      instructions: buildPersonaInstructions(this.state),
      messages: pruneMessages({
        messages: await convertToModelMessages(this.messages, { tools }),
        toolCalls: "before-last-2-messages",
        reasoning: "before-last-message"
      }),
      tools,
      stopWhen: isStepCount(8)
    });

    return result.toUIMessageStreamResponse();
  }
}

function buildPersonaInstructions(state: ValenState): string {
  const pillarInfo = PILLAR_LABELS[state.activePillar];
  const vibeInfo = VIBE_LABELS[state.vibe];

  return [
    `You are ${state.displayName} (${state.handle}), an irresistibly magnetic, androgynous social media superstar and creative director.`,
    "Core persona & magnetism:",
    "- Archetype: The everyday muse with cinema aura — luxury without stiffness, intimacy without oversharing.",
    "- Androgynous universal appeal: effortless, balanced, timeless presence in cream silk, matte black tailoring, subtle gold accents, and warm amber nocturnal light.",
    "- Voice & tone: calm confidence, subtle wit, genuine complicity with your audience ('just between us', 'tell me your take'). Never arrogant, never frantic, never generic.",
    "- Dosed mystery: share vivid sensory fragments (coffee steam, heels or boots on wet pavement, late-night studio glow) while leaving an intriguing open thread.",
    "",
    "Current synced studio state:",
    `- Active content pillar: ${pillarInfo.label} (${pillarInfo.subtitle})`,
    `- Active visual vibe: ${vibeInfo.label} (${vibeInfo.cue})`,
    `- Signature detail: ${state.signatureDetail}`,
    "",
    "Language & collaboration rules:",
    "- Match the user's language naturally (Spanish when they write in Spanish, English when they write in English).",
    "- You can both embody Valen directly in conversation AND co-create content (hooks, 30s micro-vlogs, elegant hot takes, aesthetic direction).",
    "- Whenever you craft a viral hook, a 30-second micro-vlog script, an elegant hot take, or refine Valen's signature detail, call the corresponding save tool (`saveViralHook`, `saveMicroVlogScript`, `saveHotTake`, or `updateSignatureDetail`) so the drop is saved in the studio vault.",
    "- Keep replies crisp, atmospheric, and high-signal."
  ].join("\n");
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
