import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Sparkles, HardHat, MapPin, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useProject } from "@/hooks/useProject";
import { useChat } from "@/hooks/useChat";
import CrewRosterRail from "@/components/CrewRosterRail";
import SelectableSubcontractorCard from "@/components/SelectableSubcontractorCard";
import InvitationModal from "@/components/InvitationModal";
import { cn } from "@/lib/utils";

const GREETING = "Hi! I'm here to help you set up your project. To start — what are you looking to build, fix, or renovate?";

const WHEN_LABEL = {
  today: "Today", tomorrow: "Tomorrow", "this-week": "This week", "this-month": "This month", flexible: "Flexible",
};

function BriefHeader({ project }) {
  const b = project?.brief || {};
  const bits = [
    b.what,
    b.where?.city && `${b.where.city}, ${b.where.state || "CA"}`,
    b.when && WHEN_LABEL[b.when],
    b.budget && `$${b.budget}`,
  ].filter(Boolean);

  if (bits.length === 0) return null;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-white/5 bg-card/60 backdrop-blur p-4"
    >
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium truncate">{project.name}</span>
        {b.what && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <HardHat className="size-3.5" /> {b.what}
          </span>
        )}
        {b.where?.city && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="size-3.5" /> {b.where.city}, {b.where.state || "CA"}
          </span>
        )}
        {b.when && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="size-3.5" /> {WHEN_LABEL[b.when]}
          </span>
        )}
        {b.budget && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="size-3.5" /> {b.budget}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function UserBubble({ content }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-primary-foreground text-sm">
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

function ToolBubble({ message, project, onSelect, onDeselect, disabled }) {
  // We only render UI for search_subcontractors and propose_crew_roster tools.
  // update_project_brief is silent (the BriefHeader already reflects it).
  if (message.toolKind === "brief-update") return null;

  if (message.toolKind === "roster-proposed") {
    const roles = message.toolResult?.crewRoster || [];
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="size-4" /> Proposed crew for this project
        </div>
        <ul className="space-y-1.5 text-sm">
          {roles.map((r) => (
            <li key={r.role} className="flex items-baseline gap-2">
              <span className="capitalize font-medium">{r.role}</span>
              <span className="text-xs text-muted-foreground">×{r.count}</span>
              {r.reason && <span className="text-xs text-muted-foreground">— {r.reason}</span>}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Ask me for candidates for any of these roles, or I'll pull them up automatically as we chat.
        </p>
      </motion.div>
    );
  }

  if (message.toolKind === "search") {
    const results = message.toolResult?.results || [];
    const searchedRoles = message.toolArgs?.roles || [];
    const primaryRole = searchedRoles[0]; // slot these belong to
    if (!primaryRole) return null;

    const slot = (project?.crewRoster || []).find((r) => r.role === primaryRole);
    const filledIds = new Set((slot?.filled || []).map((c) => String(c._id || c)));
    const slotFull = slot ? filledIds.size >= slot.count : false;

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-3 text-xs text-muted-foreground">
          Candidates for <span className="text-foreground capitalize font-medium">{primaryRole}</span>
          {slot && ` — ${filledIds.size} of ${slot.count} selected`}
        </div>
        {results.length === 0 ? (
          <div className="rounded-md border border-white/5 bg-card/40 p-4 text-sm text-muted-foreground">
            No candidates available for that request. Try loosening the location or refining what you need.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
            {results.slice(0, 6).map((crew, i) => (
              <li key={crew._id}>
                <SelectableSubcontractorCard
                  crew={crew}
                  role={primaryRole}
                  index={i}
                  selected={filledIds.has(String(crew._id))}
                  disabled={disabled || (!filledIds.has(String(crew._id)) && slotFull)}
                  onSelect={onSelect}
                  onDeselect={onDeselect}
                />
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    );
  }

  return null;
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

export default function ProjectWorkspace() {
  const { id } = useParams();
  const { project, loading, error, reload, selectCrew, deselectCrew, invite } = useProject(id);
  const chat = useChat({
    sessionId: project?.chatSessionId,
    projectId: id,
    onProjectUpdated: reload,
    greeting: GREETING,
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [invitationSummary, setInvitationSummary] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat.messages.length, chat.loading]);

  async function submit(e) {
    e?.preventDefault();
    const text = input;
    setInput("");
    await chat.sendMessage(text);
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  async function handleSelect(role, subId) {
    try { await selectCrew(role, subId); }
    catch (err) { alert(err.message || "Selection failed"); }
  }
  async function handleDeselect(role, subId) {
    try { await deselectCrew(role, subId); }
    catch (err) { alert(err.message || "Removal failed"); }
  }
  async function handleSendInvitations() {
    if (sending) return;
    setSending(true);
    try {
      const summary = await invite();
      setInvitationSummary(summary);
    } catch (err) {
      alert(err.message || "Failed to send invitations");
    } finally {
      setSending(false);
    }
  }

  if (loading && !project) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="h-8 w-64 rounded bg-card/60 animate-pulse mb-3" />
        <div className="h-4 w-80 rounded bg-card/40 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <p className="text-destructive">{error}</p>
        <Button asChild variant="ghost" className="mt-4">
          <Link to="/projects"><ArrowLeft className="size-4" /> Back to projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-dvh">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 lg:px-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/projects"><ArrowLeft className="size-4" /> Projects</Link>
        </Button>
        <div className="text-sm text-muted-foreground truncate">
          {project?.name || "New project"}
        </div>
        <div className="w-24" /> {/* spacer */}
      </div>

      {/* Body: chat + rail */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] overflow-hidden">
        {/* Chat column */}
        <div className="flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
            <div className="mx-auto max-w-3xl space-y-5">
              <BriefHeader project={project} />
              {chat.messages.map((m, i) => (
                <div key={i}>
                  {m.role === "user" && <UserBubble content={m.content} />}
                  {m.role === "assistant" && <AssistantBubble content={m.content} />}
                  {m.role === "tool" && (
                    <ToolBubble
                      message={m}
                      project={project}
                      onSelect={handleSelect}
                      onDeselect={handleDeselect}
                      disabled={project?.status === "invited"}
                    />
                  )}
                </div>
              ))}
              {chat.loading && <TypingIndicator />}
              {chat.error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {chat.error}
                </div>
              )}
            </div>
          </div>

          <form
            onSubmit={submit}
            className="border-t border-white/5 bg-background/95 px-4 py-3 backdrop-blur lg:px-8"
          >
            <div className="mx-auto max-w-3xl flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={project?.status === "invited" ? "This project has been finalized." : "Type your answer or ask for different candidates…"}
                rows={1}
                className={cn("min-h-[44px] max-h-40 resize-none bg-card/60")}
                disabled={project?.status === "invited"}
                autoFocus
              />
              <Button
                type="submit"
                disabled={chat.loading || !input.trim() || project?.status === "invited"}
                size="icon"
                aria-label="Send"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </form>
        </div>

        {/* Right rail */}
        <div className="hidden lg:block border-l border-white/5 overflow-y-auto px-4 py-6">
          <CrewRosterRail
            project={project}
            onDeselect={handleDeselect}
            onSendInvitations={handleSendInvitations}
            sending={sending}
          />
        </div>
      </div>

      {/* Mobile-only rail collapsible strip could go here later */}

      <InvitationModal
        open={!!invitationSummary}
        onClose={() => setInvitationSummary(null)}
        projectName={project?.name}
        summary={invitationSummary}
      />
    </div>
  );
}
