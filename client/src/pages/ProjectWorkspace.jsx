import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Send, HardHat, Calendar, MapPin, Sparkles,
  Loader2, Check, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProject } from "@/hooks/useProject";
import SubcontractorCard from "@/components/SubcontractorCard";
import InvitationModal from "@/components/InvitationModal";
import AlertModal from "@/components/AlertModal";
import { CITIES } from "../../../shared/cities.js";
import { cn } from "@/lib/utils";

const CITY_NAMES = [...new Set(CITIES.map((c) => c.city))].sort();

const STEPS = [
  { id: "name",  label: "Name" },
  { id: "when",  label: "When" },
  { id: "what",  label: "What" },
  { id: "crew",  label: "Crew" },
  { id: "sent",  label: "Send" },
];

const stepMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -24 },
  transition: { duration: 0.35, ease: "easeOut" },
};

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-[10px] font-medium transition-colors",
              i < current  ? "bg-success text-success-foreground" :
              i === current ? "bg-primary text-primary-foreground" :
              "bg-white/5 text-muted-foreground"
            )}
          >
            {i < current ? <Check className="size-3" /> : i + 1}
          </div>
          <span className={cn("text-xs hidden sm:inline", i === current ? "text-foreground" : "text-muted-foreground")}>
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={cn("h-px w-6", i < current ? "bg-success" : "bg-white/10")} />
          )}
        </div>
      ))}
    </div>
  );
}

function StepCard({ children }) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="rounded-2xl border border-white/5 bg-card/60 backdrop-blur-xl p-8 shadow-xl">
        {children}
      </div>
    </div>
  );
}

export default function ProjectWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, loading: projectLoading, error: projectError, reload, selectCrew, deselectCrew, invite } = useProject(id);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [what, setWhat] = useState("");
  const [city, setCity] = useState("");

  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState(null);
  const [candidatesByRole, setCandidatesByRole] = useState({});
  const [invitationSummary, setInvitationSummary] = useState(null);
  const [sending, setSending] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  // Hydrate form from project when it loads
  useEffect(() => {
    if (!project) return;
    setName(project.name === "New project" ? "" : project.name || "");
    setWhat(project.brief?.what || "");
    setCity(project.brief?.where?.city || "");
    if (project.brief?.startDateTime) {
      const d = new Date(project.brief.startDateTime);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setDateTime(local);
    }
    // If project already has a roster, jump to crew step
    if (project.crewRoster?.length > 0 && step === 0) {
      setStep(3);
    }
    if (project.status === "invited" && step < 4) {
      setStep(4);
    }
  }, [project]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = useCallback(async (patchBody) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    });
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    return (await res.json()).project;
  }, [id]);

  async function goName() {
    if (!name.trim()) return;
    await patch({ name: name.trim() });
    setStep(1);
  }
  async function goDate() {
    const iso = dateTime ? new Date(dateTime).toISOString() : null;
    await patch({ brief: { ...(project?.brief || {}), startDateTime: iso } });
    setStep(2);
  }
  async function goWhat() {
    if (!what.trim() || !city.trim()) return;
    await patch({
      brief: {
        ...(project?.brief || {}),
        what: what.trim(),
        where: { city: city.trim(), state: "CA" },
      },
    });
    setStep(3);
    // Kick off roster proposal + candidate fetch
    proposeRosterAndFetch();
  }

  async function proposeRosterAndFetch() {
    setRosterLoading(true);
    setRosterError(null);
    try {
      // Ask the LLM to compose the roster
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: project.chatSessionId,
          projectId: id,
          messages: [{
            role: "user",
            content: `Please compose the crew roster for this project. Details:\n- Name: ${name}\n- When: ${dateTime || "flexible"}\n- Where: ${city}, CA\n- What: ${what}\n\nCall propose_crew_roster now with the trades needed.`,
          }],
        }),
      });
      if (!chatRes.ok) throw new Error("failed to propose roster");
      await chatRes.json();
      const updated = await reload();
      // reload returns nothing — need to fetch project again to get roster
      const fresh = await fetch(`/api/projects/${id}`).then((r) => r.json());
      const roster = fresh.project?.crewRoster || [];

      // For each role, fetch candidates directly by role — reliable + fast
      // (avoids LLM parser variance from /api/search)
      const searches = await Promise.all(
        roster.map((slot) =>
          fetch(`/api/subcontractors?role=${encodeURIComponent(slot.role)}&limit=6`)
            .then((r) => r.json())
            .then((data) => [slot.role, data.results || []])
        )
      );
      setCandidatesByRole(Object.fromEntries(searches));
      await reload();
    } catch (err) {
      setRosterError(err.message || "Failed to build recommendations");
    } finally {
      setRosterLoading(false);
    }
  }

  async function handleSendInvites() {
    if (sending) return;
    setSending(true);
    try {
      const summary = await invite();
      setInvitationSummary(summary);
      setStep(4);
    } catch (err) {
      setAlertMsg(err.message || "Failed to send invitations");
    } finally {
      setSending(false);
    }
  }

  const roster = project?.crewRoster || [];
  const filled = roster.reduce((s, r) => s + Math.min(r.filled?.length || 0, r.count), 0);
  const total = roster.reduce((s, r) => s + r.count, 0);
  const allFilled = total > 0 && filled >= total;

  if (projectLoading && !project) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <div className="h-8 w-64 rounded bg-card/60 animate-pulse mb-3" />
      </div>
    );
  }
  if (projectError) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <p className="text-destructive">{projectError}</p>
        <Button asChild variant="ghost" className="mt-4">
          <Link to="/projects"><ArrowLeft className="size-4" /> Back to projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 lg:px-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/projects"><ArrowLeft className="size-4" /> Projects</Link>
        </Button>
        <div className="text-sm text-muted-foreground truncate">
          {project?.name && project.name !== "New project" ? project.name : "New project"}
        </div>
        <div className="w-24" />
      </div>

      <StepIndicator current={step} />

      {/* Body: centered current step */}
      <div className="flex-1 flex items-start justify-center px-4 py-8 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* STEP 0 — Name */}
          {step === 0 && (
            <motion.div key="name" {...stepMotion} className="w-full">
              <StepCard>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <HardHat className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-normal tracking-tight">Name your project</h2>
                    <p className="text-sm text-muted-foreground">Something short you'll recognize later.</p>
                  </div>
                </div>
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && goName()}
                  placeholder="Palm Desert kitchen rewire"
                  className="h-12 text-base"
                />
                <div className="mt-6 flex justify-end">
                  <Button onClick={goName} disabled={!name.trim()} size="lg">
                    Next <ArrowRight className="size-4" />
                  </Button>
                </div>
              </StepCard>
            </motion.div>
          )}

          {/* STEP 1 — When */}
          {step === 1 && (
            <motion.div key="when" {...stepMotion} className="w-full">
              <StepCard>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Calendar className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-normal tracking-tight">When does the project start?</h2>
                    <p className="text-sm text-muted-foreground">Pick a date and time. You can adjust later.</p>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full h-12 rounded-md border border-input bg-background px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring [color-scheme:dark]"
                />
                <div className="mt-6 flex items-center justify-between">
                  <Button variant="ghost" onClick={() => setStep(0)}>
                    <ArrowLeft className="size-4" /> Back
                  </Button>
                  <Button onClick={goDate} size="lg">
                    Next <ArrowRight className="size-4" />
                  </Button>
                </div>
              </StepCard>
            </motion.div>
          )}

          {/* STEP 2 — What's needed */}
          {step === 2 && (
            <motion.div key="what" {...stepMotion} className="w-full">
              <StepCard>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-normal tracking-tight">What needs to be done?</h2>
                    <p className="text-sm text-muted-foreground">Describe the work and the location.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Project description</label>
                    <Textarea
                      value={what}
                      onChange={(e) => setWhat(e.target.value)}
                      placeholder="e.g. Full kitchen rewire, ~1400 sqft home, need code-compliant panel upgrade"
                      className="min-h-[100px] text-base"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      <MapPin className="inline size-3.5 mr-1" /> City in Southern California
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full h-12 rounded-md border border-input bg-background px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select a city…</option>
                      {CITY_NAMES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)}>
                    <ArrowLeft className="size-4" /> Back
                  </Button>
                  <Button onClick={goWhat} disabled={!what.trim() || !city.trim()} size="lg">
                    Find crew <ArrowRight className="size-4" />
                  </Button>
                </div>
              </StepCard>
            </motion.div>
          )}

          {/* STEP 3 — Recommended crew + selection */}
          {step === 3 && (
            <motion.div key="crew" {...stepMotion} className="w-full max-w-5xl mx-auto">
              <div className="rounded-2xl border border-white/5 bg-card/60 backdrop-blur-xl p-6 md:p-8 shadow-xl">
                <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Users className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-normal tracking-tight">Recommended crew</h2>
                      <p className="text-sm text-muted-foreground">
                        Select one candidate per role. {filled}/{total} selected.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      onClick={handleSendInvites}
                      disabled={!allFilled || sending}
                      size="lg"
                    >
                      <Send className="size-4" />
                      {sending ? "Sending…" : "Send invitations"}
                    </Button>
                    {!allFilled && total > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Select {total - filled} more to enable
                      </span>
                    )}
                  </div>
                </div>

                {rosterLoading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p>Composing your crew…</p>
                  </div>
                )}

                {rosterError && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                    {rosterError}
                  </div>
                )}

                {!rosterLoading && roster.length > 0 && (
                  <div className="space-y-10">
                    {roster.map((slot) => {
                      const cands = candidatesByRole[slot.role] || slot.filled || [];
                      const filledIds = new Set((slot.filled || []).map((c) => String(c._id || c)));
                      const slotFull = filledIds.size >= slot.count;
                      return (
                        <section key={slot.role}>
                          <div className="mb-3 flex items-baseline justify-between">
                            <h3 className="text-lg font-normal capitalize">
                              {slot.role}
                              <span className="ml-2 text-sm text-muted-foreground">
                                {filledIds.size}/{slot.count} selected
                              </span>
                            </h3>
                            {slotFull && <Check className="size-4 text-success" />}
                          </div>
                          {slot.reason && (
                            <p className="mb-4 text-sm text-muted-foreground">{slot.reason}</p>
                          )}
                          <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
                            {cands.slice(0, 6).map((crew, i) => {
                              const isSelected = filledIds.has(String(crew._id));
                              const disabled = project?.status === "invited" || (!isSelected && slotFull);
                              return (
                                <li key={crew._id}>
                                  <SubcontractorCard crew={crew} index={i} />
                                  <Button
                                    onClick={async () => {
                                      if (disabled) return;
                                      try {
                                        if (isSelected) await deselectCrew(slot.role, crew._id);
                                        else await selectCrew(slot.role, crew._id);
                                      } catch (err) { setAlertMsg(err.message); }
                                    }}
                                    disabled={disabled}
                                    variant={isSelected ? "secondary" : "default"}
                                    className="mt-3 w-full"
                                    size="sm"
                                  >
                                    {isSelected ? (<><Check className="size-4" /> Selected</>) : (<>Select</>)}
                                  </Button>
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 4 — Invitations sent (fallback if modal closed) */}
          {step === 4 && (
            <motion.div key="sent" {...stepMotion} className="w-full">
              <StepCard>
                <div className="text-center">
                  <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-success/15">
                    <Check className="size-7 text-success" />
                  </div>
                  <h2 className="text-2xl font-light tracking-tight">Invitations sent</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your crew has been notified and their calendars updated.
                  </p>
                  <Button className="mt-6" onClick={() => navigate("/projects")}>
                    Back to projects <ArrowRight className="size-4" />
                  </Button>
                </div>
              </StepCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <InvitationModal
        open={!!invitationSummary}
        onClose={() => setInvitationSummary(null)}
        projectName={project?.name}
        summary={invitationSummary}
      />
      <AlertModal
        open={!!alertMsg}
        onClose={() => setAlertMsg(null)}
        title="Something went wrong"
        message={alertMsg}
      />
    </div>
  );
}
