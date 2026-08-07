import { useCallback, useState } from "react";

/**
 * Project-aware chat state.
 *
 * @param {Object} opts
 * @param {string} opts.sessionId       stable chat session id (from project.chatSessionId)
 * @param {string} [opts.projectId]     optional; when set, /api/chat runs in project mode
 * @param {Function} [opts.onProjectUpdated]  called after any tool result that changed the project
 * @param {string} [opts.greeting]      hardcoded assistant greeting shown before any API call
 */
export function useChat({ sessionId, projectId, onProjectUpdated, greeting } = {}) {
  const [messages, setMessages] = useState(
    greeting ? [{ role: "assistant", content: greeting }] : []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (text) => {
    const trimmed = String(text || "").trim();
    if (!trimmed || loading) return;

    const userMsg = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          projectId,
          messages: nextMessages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();

      const additions = [];
      if (data.assistant?.content) {
        additions.push({ role: "assistant", content: data.assistant.content });
      }
      for (const tc of data.toolCalls || []) {
        additions.push({
          role: "tool",
          content: "",
          toolName: tc.name,
          toolArgs: tc.args,
          toolResult: tc.result,
          toolKind: tc.kind,
        });
      }
      setMessages((prev) => [...prev, ...additions]);

      if (data.projectUpdated && typeof onProjectUpdated === "function") {
        onProjectUpdated();
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [messages, loading, sessionId, projectId, onProjectUpdated]);

  return { messages, loading, error, sendMessage };
}
