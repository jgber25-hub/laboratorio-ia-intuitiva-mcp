import "./styles.css";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useAgent } from "agents/react";
import { getToolPartState, useAgentChat } from "@cloudflare/ai-chat/react";
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import {
  Badge,
  Button,
  InputArea,
  PoweredByCloudflare,
  Surface,
  Text
} from "@cloudflare/kumo";
import {
  BookmarkSimpleIcon,
  CameraIcon,
  ChatCircleTextIcon,
  FilmSlateIcon,
  FireIcon,
  GearIcon,
  InfoIcon,
  MoonIcon,
  PaperPlaneRightIcon,
  SparkleIcon,
  StopIcon,
  SunIcon,
  TrashIcon,
  XCircleIcon,
  XIcon
} from "@phosphor-icons/react";
import {
  CONTENT_PILLARS,
  DEFAULT_STATE,
  PILLAR_LABELS,
  VIBE_LABELS,
  VIBE_MODES,
  type ContentPillar,
  type SavedDrop,
  type ValenState,
  type VibeMode
} from "./shared";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  const dot =
    status === "connected"
      ? "bg-green-500"
      : status === "connecting"
        ? "bg-yellow-500"
        : "bg-red-500";
  const text =
    status === "connected"
      ? "text-kumo-success"
      : status === "connecting"
        ? "text-kumo-warning"
        : "text-kumo-danger";
  const label =
    status === "connected"
      ? "Connected"
      : status === "connecting"
        ? "Connecting..."
        : "Disconnected";
  return (
    <output className="flex items-center gap-2">
      <span className={`size-2 rounded-full ${dot}`} />
      <span className={`text-xs ${text}`}>{label}</span>
    </output>
  );
}

function ModeToggle() {
  const [mode, setMode] = useState(
    () => localStorage.getItem("theme") || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
    document.documentElement.style.colorScheme = mode;
    localStorage.setItem("theme", mode);
  }, [mode]);

  return (
    <Button
      variant="ghost"
      shape="square"
      aria-label="Toggle theme"
      onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}
      icon={mode === "light" ? <MoonIcon size={16} /> : <SunIcon size={16} />}
    />
  );
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => {
      return part.type === "text";
    })
    .map((part) => part.text)
    .join("");
}

function shouldShowStreamedTextPart(part: {
  text: string;
  state?: "streaming" | "done";
}): boolean {
  return part.text.length > 0 || part.state === "streaming";
}

function formatToolOutput(output: unknown): string {
  if (typeof output === "string") return output;
  return JSON.stringify(output, null, 2);
}

const STARTER_PROMPTS = [
  {
    label: "Hook viral (2s)",
    prompt:
      "Crea y guarda un hook magnético de 2 segundos para un reel nocturno en la ciudad."
  },
  {
    label: "Micro-vlog 30s",
    prompt:
      "Escribe y guarda el guion de un micro-vlog de 30 segundos titulado 'Una noche conmigo después del desfile'."
  },
  {
    label: "Hot take elegante",
    prompt:
      "Tira y guarda un hot take sutil sobre por qué el misterio vale más que sobreexponerse en redes."
  },
  {
    label: "Charla en personaje",
    prompt:
      "Valen, acabo de entrar a tu live. ¿Qué estás haciendo a esta hora y qué detalle no debería pasar por alto?"
  }
];

function dropKindLabel(kind: SavedDrop["kind"]): string {
  switch (kind) {
    case "hook":
      return "Hook";
    case "micro-vlog":
      return "Micro-Vlog";
    case "hot-take":
      return "Hot Take";
    case "signature":
      return "Signature";
  }
}

function Chat() {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [input, setInput] = useState("");
  const [showVault, setShowVault] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const agent = useAgent<ValenState>({
    agent: "ValenVanceAgent",
    onOpen: useCallback(() => setConnectionStatus("connected"), []),
    onClose: useCallback(() => setConnectionStatus("disconnected"), []),
    onError: useCallback(
      (error: Event) => console.error("WebSocket error:", error),
      []
    )
  });

  const { messages, sendMessage, clearHistory, stop, isStreaming } =
    useAgentChat({
      agent,
      experimental_throttle: 100
    });

  const state = agent.state ?? DEFAULT_STATE;
  const isConnected = connectionStatus === "connected";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(
    (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || isStreaming || !isConnected) return;
      if (!overrideText) setInput("");
      sendMessage({ role: "user", parts: [{ type: "text", text }] });
    },
    [input, isStreaming, isConnected, sendMessage]
  );

  const handlePillarChange = async (pillar: ContentPillar) => {
    try {
      await agent.call("setPillar", [pillar]);
    } catch (error) {
      console.error("Failed to switch pillar:", error);
    }
  };

  const handleVibeChange = async (vibe: VibeMode) => {
    try {
      await agent.call("setVibe", [vibe]);
    } catch (error) {
      console.error("Failed to switch vibe:", error);
    }
  };

  const handleRemoveDrop = async (id: string) => {
    try {
      await agent.call("removeSavedDrop", [id]);
    } catch (error) {
      console.error("Failed to remove saved drop:", error);
    }
  };

  const handleClearDrops = async () => {
    try {
      await agent.call("clearSavedDrops", []);
    } catch (error) {
      console.error("Failed to clear saved drops:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-kumo-elevated">
      {/* Header */}
      <header className="px-5 py-3.5 bg-kumo-base border-b border-kumo-line">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/avatar.jpg"
              alt={state.displayName}
              className="size-10 rounded-full object-cover ring-2 ring-amber-500/60 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-kumo-default truncate">
                  {state.displayName}
                </h1>
                <Badge variant="secondary">{state.handle}</Badge>
              </div>
              <p className="text-xs text-kumo-subtle truncate">
                {VIBE_LABELS[state.vibe].label} ·{" "}
                {PILLAR_LABELS[state.activePillar].label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ConnectionIndicator status={connectionStatus} />
            <ModeToggle />
            <Button
              variant="secondary"
              icon={<BookmarkSimpleIcon size={16} />}
              onClick={() => setShowVault((v) => !v)}
            >
              Vault
              {state.savedDrops.length > 0 && (
                <Badge variant="primary" className="ml-1.5">
                  {state.savedDrops.length}
                </Badge>
              )}
            </Button>
            <Button
              variant="secondary"
              icon={<TrashIcon size={16} />}
              onClick={clearHistory}
            >
              Clear
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-5 py-6 space-y-5">
          {/* Explainer */}
          <Surface className="p-4 rounded-xl ring ring-kumo-line">
            <div className="flex gap-3">
              <InfoIcon
                size={20}
                weight="bold"
                className="text-kumo-accent shrink-0 mt-0.5"
              />
              <div>
                <Text size="sm" bold>
                  Valen Vance — Persona &amp; Creator Studio Agent
                </Text>
                <span className="mt-1 block">
                  <Text size="xs" variant="secondary">
                    An interactive <code>AIChatAgent</code> embodying an
                    androgynous social media superstar persona with synced
                    Durable Object state, <code>@callable()</code> studio
                    controls, and creator tools that persist hooks, micro-vlogs,
                    and hot takes to the studio vault.
                  </Text>
                </span>
              </div>
            </div>
          </Surface>

          {/* Persona Card + Studio Controls */}
          <Surface className="p-4 rounded-xl ring ring-kumo-line">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <img
                src="/avatar.jpg"
                alt={`${state.displayName} editorial portrait`}
                className="size-24 sm:size-28 rounded-xl object-cover ring ring-kumo-line shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Text size="sm" bold>
                        {state.displayName}
                      </Text>
                      <Badge variant="primary">
                        <SparkleIcon size={10} className="mr-1" />
                        Live Persona
                      </Badge>
                    </div>
                    <p className="text-xs text-kumo-subtle mt-0.5">
                      {state.signatureDetail}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-kumo-inactive font-semibold block mb-1.5">
                      Content Pillar
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {CONTENT_PILLARS.map((pillar) => (
                        <Button
                          key={pillar}
                          size="sm"
                          variant={
                            state.activePillar === pillar
                              ? "primary"
                              : "secondary"
                          }
                          disabled={!isConnected}
                          onClick={() => handlePillarChange(pillar)}
                        >
                          {PILLAR_LABELS[pillar].label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-kumo-inactive font-semibold block mb-1.5">
                      Visual Vibe
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {VIBE_MODES.map((vibe) => (
                        <Button
                          key={vibe}
                          size="sm"
                          variant={
                            state.vibe === vibe ? "primary" : "secondary"
                          }
                          disabled={!isConnected}
                          onClick={() => handleVibeChange(vibe)}
                        >
                          {VIBE_LABELS[vibe].label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Surface>

          {/* Saved Drops Vault */}
          {showVault && (
            <Surface className="p-4 rounded-xl ring ring-kumo-line space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookmarkSimpleIcon
                    size={16}
                    weight="bold"
                    className="text-kumo-accent"
                  />
                  <Text size="sm" bold>
                    Studio Vault ({state.savedDrops.length})
                  </Text>
                </div>
                <div className="flex items-center gap-2">
                  {state.savedDrops.length > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleClearDrops}
                    >
                      Clear Vault
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    shape="square"
                    aria-label="Close vault"
                    icon={<XIcon size={14} />}
                    onClick={() => setShowVault(false)}
                  />
                </div>
              </div>

              {state.savedDrops.length === 0 ? (
                <p className="text-xs text-kumo-subtle">
                  Ask Valen to craft a viral hook, 30s micro-vlog script, or hot
                  take — saved drops appear here and persist in Durable Object
                  state.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {state.savedDrops.map((drop) => (
                    <div
                      key={drop.id}
                      className="p-3 rounded-lg border border-kumo-line bg-kumo-base space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="secondary">
                            {dropKindLabel(drop.kind)}
                          </Badge>
                          <span className="text-xs font-medium text-kumo-default truncate">
                            {drop.title}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          shape="square"
                          aria-label={`Remove ${drop.title}`}
                          icon={<XIcon size={12} />}
                          onClick={() => handleRemoveDrop(drop.id)}
                        />
                      </div>
                      <pre className="text-xs text-kumo-subtle whitespace-pre-wrap font-sans leading-relaxed">
                        {drop.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </Surface>
          )}

          {/* Starter Prompts when empty */}
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STARTER_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={!isConnected || isStreaming}
                    onClick={() => send(item.prompt)}
                    className="text-left p-3.5 rounded-xl border border-kumo-line bg-kumo-base hover:border-kumo-accent/60 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FilmSlateIcon
                        size={14}
                        weight="bold"
                        className="text-kumo-accent"
                      />
                      <span className="text-xs font-semibold text-kumo-default">
                        {item.label}
                      </span>
                    </div>
                    <p className="text-xs text-kumo-subtle leading-relaxed">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            const isLastAssistant =
              message.role === "assistant" && index === messages.length - 1;

            if (isUser) {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-kumo-contrast text-kumo-inverse leading-relaxed">
                    {getMessageText(message)}
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id} className="space-y-2">
                {message.parts.map((part, partIndex) => {
                  if (part.type === "text") {
                    if (!shouldShowStreamedTextPart(part)) return null;
                    const isLastTextPart = message.parts
                      .slice(partIndex + 1)
                      .every((p) => p.type !== "text");
                    return (
                      <div
                        key={partIndex}
                        className="flex items-start gap-2.5 justify-start"
                      >
                        <img
                          src="/avatar.jpg"
                          alt={state.displayName}
                          className="size-7 rounded-full object-cover ring ring-amber-500/40 shrink-0 mt-1"
                        />
                        <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-md bg-kumo-base text-kumo-default leading-relaxed">
                          <Streamdown
                            className="sd-theme min-h-[1.25em]"
                            plugins={{ code }}
                            controls={false}
                            isAnimating={
                              isLastAssistant && isLastTextPart && isStreaming
                            }
                          >
                            {part.text}
                          </Streamdown>
                        </div>
                      </div>
                    );
                  }

                  if (part.type === "reasoning") {
                    if (!shouldShowStreamedTextPart(part)) return null;
                    return (
                      <div key={partIndex} className="flex justify-start pl-9">
                        <Surface className="max-w-[85%] px-4 py-2.5 rounded-xl ring ring-kumo-line opacity-70">
                          <div className="flex items-center gap-2 mb-1">
                            <GearIcon
                              size={14}
                              className="text-kumo-inactive"
                            />
                            <Text size="xs" variant="secondary" bold>
                              Thinking
                            </Text>
                          </div>
                          <div className="whitespace-pre-wrap text-xs text-kumo-subtle italic">
                            {part.text}
                          </div>
                        </Surface>
                      </div>
                    );
                  }

                  if (!isToolUIPart(part)) return null;

                  const toolName = getToolName(part);
                  const toolInput = part.input as
                    | Record<string, unknown>
                    | undefined;
                  const toolOutput = (part as { output?: unknown }).output;
                  const errorText = (part as { errorText?: string }).errorText;

                  const toolState = getToolPartState(part);
                  const isRunning =
                    toolState === "loading" || toolState === "streaming";
                  const isDone = toolState === "complete";
                  const isError = toolState === "error";
                  const isDenied = toolState === "denied";

                  const ToolIcon =
                    toolName === "saveViralHook"
                      ? FireIcon
                      : toolName === "saveMicroVlogScript"
                        ? CameraIcon
                        : toolName === "saveHotTake"
                          ? ChatCircleTextIcon
                          : SparkleIcon;

                  return (
                    <div
                      key={part.toolCallId}
                      className="flex justify-start pl-9"
                    >
                      <Surface className="max-w-[85%] px-4 py-2.5 rounded-xl ring ring-kumo-line overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          {isError || isDenied ? (
                            <XCircleIcon
                              size={14}
                              className="text-kumo-danger"
                            />
                          ) : isRunning ? (
                            <GearIcon
                              size={14}
                              className="text-kumo-inactive animate-spin"
                            />
                          ) : (
                            <ToolIcon size={14} className="text-kumo-accent" />
                          )}
                          <Text size="xs" variant="secondary" bold>
                            {isRunning ? `Running ${toolName}...` : toolName}
                          </Text>
                          {isDone && (
                            <Badge variant="secondary">Saved to Vault</Badge>
                          )}
                          {isError && (
                            <Badge variant="destructive">Error</Badge>
                          )}
                          {isDenied && (
                            <Badge variant="secondary">Denied</Badge>
                          )}
                        </div>

                        {toolInput != null && (
                          <div className="mt-2">
                            <span className="text-[10px] uppercase tracking-wider text-kumo-inactive font-semibold">
                              Input
                            </span>
                            <pre className="mt-1 p-2 rounded-lg bg-kumo-elevated text-xs font-mono text-kumo-subtle overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                              {JSON.stringify(toolInput, null, 2)}
                            </pre>
                          </div>
                        )}

                        {errorText && (
                          <div className="mt-2">
                            <span className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">
                              Error
                            </span>
                            <pre className="mt-1 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 text-xs font-mono text-red-600 dark:text-red-400 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                              {errorText}
                            </pre>
                          </div>
                        )}

                        {toolOutput != null && (
                          <div className="mt-2">
                            <span className="text-[10px] uppercase tracking-wider text-kumo-inactive font-semibold">
                              Output
                            </span>
                            <pre className="mt-1 p-2 rounded-lg bg-kumo-elevated text-xs font-mono text-kumo-subtle overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                              {formatToolOutput(toolOutput)}
                            </pre>
                          </div>
                        )}
                      </Surface>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-kumo-line bg-kumo-base">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="max-w-4xl mx-auto px-5 py-4"
        >
          <div className="flex items-end gap-3 rounded-xl border border-kumo-line bg-kumo-base p-3 shadow-sm focus-within:ring-2 focus-within:ring-kumo-ring focus-within:border-transparent transition-shadow">
            <InputArea
              value={input}
              onValueChange={setInput}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Habla con Valen o pídele un hook viral, micro-vlog o hot take..."
              disabled={!isConnected || isStreaming}
              rows={2}
              className="flex-1 !ring-0 focus:!ring-0 !shadow-none !bg-transparent !outline-none"
            />
            {isStreaming ? (
              <Button
                type="button"
                variant="secondary"
                shape="square"
                aria-label="Stop streaming"
                onClick={stop}
                icon={<StopIcon size={18} weight="fill" />}
                className="mb-0.5"
              />
            ) : (
              <Button
                type="submit"
                variant="primary"
                shape="square"
                aria-label="Send message"
                disabled={!input.trim() || !isConnected}
                icon={<PaperPlaneRightIcon size={18} />}
                className="mb-0.5"
              />
            )}
          </div>
        </form>
        <div className="flex justify-center pb-3">
          <PoweredByCloudflare href="https://developers.cloudflare.com/agents/" />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-kumo-inactive">
          Loading...
        </div>
      }
    >
      <Chat />
    </Suspense>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
