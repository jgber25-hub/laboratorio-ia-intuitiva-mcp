# Valen Vance — Social Star Persona Agent

An interactive full-stack AI agent built with `@cloudflare/ai-chat`, Durable Object synced state, `@callable()` studio controls, and Workers AI. It embodies **Valen Vance (`@valenvance`)** — an androgynous, magnetic social media superstar persona — and includes a persistent Studio Vault for viral hooks, 30-second micro-vlog scripts, hot takes, and signature aesthetic cues.

## Running

```bash
pnpm install
pnpm run start
```

Uses Workers AI (no API key needed) with `@cf/moonshotai/kimi-k2.7-code`.

## Key pattern

```ts
export class ValenVanceAgent extends AIChatAgent<Env, ValenState> {
  initialState = DEFAULT_STATE;

  @callable()
  async setPillar(pillar: ContentPillar) {
    const next = { ...this.state, activePillar: pillar };
    this.setState(next);
    return next;
  }
}
```

## Related examples

- [AI Chat](../ai-chat/)
- [Structured Input](../structured-input/)
- [ElevenLabs Character Agent](../elevenlabs-starter/)
