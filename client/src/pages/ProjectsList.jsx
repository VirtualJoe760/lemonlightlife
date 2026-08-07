import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FolderKanban, Plus, Users, Send, MessageSquare, ArrowRight, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectsList } from "@/hooks/useProjectsList";
import AlertModal from "@/components/AlertModal";
import { cn } from "@/lib/utils";

const STATUS_META = {
  brief:     { label: "Gathering brief",  color: "text-primary bg-primary/10",   icon: MessageSquare },
  selecting: { label: "Selecting crew",   color: "text-warning bg-warning/10",   icon: Users },
  invited:   { label: "Crew invited",     color: "text-success bg-success/10",   icon: Send },
  archived:  { label: "Archived",         color: "text-muted-foreground bg-white/5", icon: FolderKanban },
};

function ProjectCard({ project, onDelete }) {
  const meta = STATUS_META[project.status] || STATUS_META.brief;
  const Icon = meta.icon;
  const briefText = project.brief?.what || "No description yet";
  const where = project.brief?.where?.city;
  const total = (project.crewRoster || []).reduce((s, r) => s + r.count, 0);
  const filled = (project.crewRoster || []).reduce((s, r) => s + Math.min((r.filled?.length || 0), r.count), 0);

  function handleDelete(e) {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Delete "${project.name || "Untitled project"}"?`)) {
      onDelete?.(project._id);
    }
  }

  return (
    <Link
      to={`/projects/${project._id}`}
      className="group relative flex flex-col rounded-xl border border-white/5 bg-card/60 backdrop-blur p-5 transition-colors hover:border-primary/40 hover:bg-card/80"
    >
      <button
        type="button"
        onClick={handleDelete}
        className="absolute top-3 right-3 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100 focus:opacity-100"
        aria-label={`Delete ${project.name}`}
      >
        <Trash2 className="size-4" />
      </button>
      <div className="flex items-start justify-between gap-3 mb-2 pr-8">
        <h3 className="text-lg font-normal tracking-tight leading-snug line-clamp-2">
          {project.name || "Untitled project"}
        </h3>
        <ArrowRight className="size-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
        {briefText}
      </p>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        {where && (
          <>
            <span>{where}</span>
            <span className="text-white/20">·</span>
          </>
        )}
        <Clock className="size-3" />
        <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-normal",
            meta.color
          )}
        >
          <Icon className="size-3" />
          {meta.label}
        </span>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {filled}/{total} crew
          </span>
        )}
      </div>
    </Link>
  );
}

export default function ProjectsList() {
  const { projects, loading, create, remove } = useProjectsList();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  async function handleDelete(id) {
    try { await remove(id); }
    catch (err) { setAlertMsg(err.message || "Failed to delete"); }
  }

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      const project = await create();
      navigate(`/projects/${project._id}`);
    } catch (err) {
      setAlertMsg(err.message || "Failed to create project");
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-light tracking-tight sm:text-5xl">Projects</h1>
          <p className="mt-3 text-muted-foreground max-w-xl">
            Every project starts with a short chat. The assistant asks a few questions, proposes a crew, and helps you pick each person.
          </p>
        </div>
        <Button size="lg" onClick={handleCreate} disabled={creating}>
          <Plus className="size-4" /> {creating ? "Creating…" : "Create new project"}
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-card/40" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-dashed border-white/10 bg-card/40 p-12 text-center"
        >
          <FolderKanban className="mx-auto size-8 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-normal">No projects yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Start your first one — the assistant will guide you through the details.
          </p>
          <Button className="mt-6" onClick={handleCreate} disabled={creating}>
            <Plus className="size-4" /> Create new project
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project._id} project={project} onDelete={handleDelete} />
          ))}
        </div>
      )}
      <AlertModal
        open={!!alertMsg}
        onClose={() => setAlertMsg(null)}
        title="Something went wrong"
        message={alertMsg}
      />
    </div>
  );
}
