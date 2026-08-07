import { useCallback, useRef, useState } from "react";

function newSessionId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Chat state hook.
 *
 * Local messages carry an extra `toolResult` field on assistant/tool
 * messages so the UI can render <SubcontractorResults> inline; the API
 * itself only accepts standard { role, content } messages when we POST.
 */
export function useChat() {
  const [messages, setMessages] = useState([]);      // [{ role, content, toolResult? }]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const sessionIdRef = useRef(newSessionId());

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
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
          sessionId: sessionIdRef.current,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();

      // Push assistant text + one "tool" bubble per tool call.
      const additions = [];
      if (data.assistant?.content) {
        additions.push({ role: "assistant", content: data.assistant.content });
      }
      for (const tc of data.toolCalls || []) {
        additions.push({
          role: "tool",
          content: "",
          toolName: tc.name,
          toolResult: tc.result,
        });
      }
      setMessages((prev) => [...prev, ...additions]);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const newChat = useCallback(() => {
    sessionIdRef.current = newSessionId();
    setMessages([]);
    setError(null);
    setLoading(false);
  }, []);

  return {
    sessionId: sessionIdRef.current,
    messages,
    loading,
    error,
    sendMessage,
    newChat,
  };
}
