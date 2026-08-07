import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, RotateCcw, HardHat, Sparkles } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import SubcontractorResults from "@/components/SubcontractorResults";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Need a licensed electrician in Palm Desert for a kitchen rewire tomorrow",
  "Looking for a vinyl flooring specialist in Long Beach this week",
  "Stone mason for chimney restoration in Escondido",
];

function UserBubble({ content }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-primary-foreground">
        {content}
      </div>
    </div>
  );
}

function AssistantBubble({ content }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Sparkles className="size-4" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2 text-sm leading-relaxed">
        {content}
      </div>
    </div>
  );
}

function ToolBubble({ result }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <SubcontractorResults results={result?.results || []} parsedFilters={result?.parsedFilters} />
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Sparkles className="size-4" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        <div className="flex gap-1">
          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60" />
        </div>
      </div>
    </div>
  );
}

function EmptyHero({ onPick }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <HardHat className="size-7" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">What crew do you need?</h2>
      <p className="mt-2 text-muted-foreground">
        Describe the project in one sentence. Include the role, city, and timing if you know them.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onPick(ex)}
            className="rounded-lg border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Chat() {
  const { messages, loading, error, sendMessage, newChat } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, loading]);

  async function submit(e) {
    e?.preventDefault();
    const text = input;
    setInput("");
    await sendMessage(text);
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-dvh">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 lg:px-8">
        <h1 className="text-lg font-semibold">Chat</h1>
        {messages.length > 0 && (
          <Button size="sm" variant="ghost" onClick={newChat}>
            <RotateCcw className="size-4" /> New chat
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-4">
          {messages.length === 0 && <EmptyHero onPick={(t) => { setInput(t); }} />}
          {messages.map((m, i) => (
            <div key={i}>
              {m.role === "user" && <UserBubble content={m.content} />}
              {m.role === "assistant" && <AssistantBubble content={m.content} />}
              {m.role === "tool" && <ToolBubble result={m.toolResult} />}
            </div>
          ))}
          {loading && <TypingIndicator />}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={submit}
        className="border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:px-8"
      >
        <div className="mx-auto max-w-4xl flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Describe the crew you need…"
            rows={1}
            className={cn("min-h-[44px] max-h-40 resize-none")}
            autoFocus
          />
          <Button type="submit" disabled={loading || !input.trim()} size="icon" aria-label="Send">
            <Send className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
