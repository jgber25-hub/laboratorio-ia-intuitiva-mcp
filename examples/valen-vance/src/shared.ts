export const CONTENT_PILLARS = [
  "micro-vlog",
  "hot-take",
  "signature-detail",
  "live-complicity"
] as const;

export type ContentPillar = (typeof CONTENT_PILLARS)[number];

export const PILLAR_LABELS: Record<
  ContentPillar,
  { label: string; subtitle: string }
> = {
  "micro-vlog": {
    label: "Micro-Vlog",
    subtitle: "30s cinematic night stories"
  },
  "hot-take": {
    label: "Hot Take",
    subtitle: "Calm, debate-sparking perspective"
  },
  "signature-detail": {
    label: "Signature Detail",
    subtitle: "Iconic aesthetic & recurring cues"
  },
  "live-complicity": {
    label: "Complicity",
    subtitle: "Intimate Q&A & community replies"
  }
};

export const VIBE_MODES = [
  "golden-hour",
  "after-hours",
  "backseat-raw"
] as const;

export type VibeMode = (typeof VIBE_MODES)[number];

export const VIBE_LABELS: Record<VibeMode, { label: string; cue: string }> = {
  "golden-hour": {
    label: "Golden Hour",
    cue: "Warm amber rim light, effortless magnetism"
  },
  "after-hours": {
    label: "After Hours",
    cue: "Urban bokeh, cream silk, unhurried mystery"
  },
  "backseat-raw": {
    label: "Backseat Raw",
    cue: "Unfiltered camera-direct confessional"
  }
};

export type SavedDropKind = "hook" | "micro-vlog" | "hot-take" | "signature";

export interface SavedDrop {
  id: string;
  kind: SavedDropKind;
  title: string;
  content: string;
  createdAt: string;
}

export interface ValenState {
  handle: string;
  displayName: string;
  activePillar: ContentPillar;
  vibe: VibeMode;
  signatureDetail: string;
  savedDrops: SavedDrop[];
}

export const DEFAULT_STATE: ValenState = {
  handle: "@valenvance",
  displayName: "Valen Vance",
  activePillar: "micro-vlog",
  vibe: "after-hours",
  signatureDetail:
    "Unbuttoned cream silk shirt, matte black blazer, fine gold chain, and closing every clip with: 'Don't tell everyone where you found me.'",
  savedDrops: []
};

export const MODEL = "@cf/moonshotai/kimi-k2.7-code";

export function isContentPillar(value: unknown): value is ContentPillar {
  return (
    typeof value === "string" &&
    CONTENT_PILLARS.some((pillar) => pillar === value)
  );
}

export function isVibeMode(value: unknown): value is VibeMode {
  return typeof value === "string" && VIBE_MODES.some((vibe) => vibe === value);
}

export function isValidValenState(value: unknown): value is ValenState {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.handle === "string" &&
    typeof record.displayName === "string" &&
    isContentPillar(record.activePillar) &&
    isVibeMode(record.vibe) &&
    typeof record.signatureDetail === "string" &&
    Array.isArray(record.savedDrops)
  );
}
