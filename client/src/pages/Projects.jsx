import { FolderKanban } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Projects() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <FolderKanban className="size-7" />
        </div>
        <h1 className="text-3xl font-light tracking-tight">Projects</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Save chat sessions as projects, track which crew you've selected, and continue where you left off. Out of scope for this trial build — the plumbing to persist chat sessions (<code className="rounded bg-muted px-1 py-0.5 text-xs">ChatLog</code>) is in place and would power this view.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/chat">Start a chat</Link>
        </Button>
      </div>
    </div>
  );
}
