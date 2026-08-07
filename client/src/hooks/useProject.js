import { useCallback, useEffect, useState } from "react";

export function useProject(projectId) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error((await res.json()).error || res.statusText);
      const data = await res.json();
      setProject(data.project);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectCrew = useCallback(async (role, subcontractorId) => {
    const res = await fetch(`/api/projects/${projectId}/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, subcontractorId }),
    });
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    const data = await res.json();
    setProject(data.project);
    return data.project;
  }, [projectId]);

  const deselectCrew = useCallback(async (role, subcontractorId) => {
    const res = await fetch(`/api/projects/${projectId}/deselect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, subcontractorId }),
    });
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    const data = await res.json();
    setProject(data.project);
    return data.project;
  }, [projectId]);

  const invite = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/invite`, { method: "POST" });
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    const data = await res.json();
    setProject(data.project);
    return data.summary;
  }, [projectId]);

  return { project, loading, error, reload: load, selectCrew, deselectCrew, invite };
}
