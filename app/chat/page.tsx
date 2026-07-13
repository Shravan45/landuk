"use client";

import { FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Citation } from "@/types/rag";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  error?: boolean;
}

const SUGGESTIONS = [
  "What's the difference between the Skilled Worker visa and Global Talent visa?",
  "How much is Council Tax and how does banding work?",
  "Can I bring my family on a Student visa?",
  "How long can I stay on the Youth Mobility Scheme?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(query: string) {
    if (!query.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, citations: data.citations },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Something went wrong answering that. Check that GEMINI_API_KEY and Supabase env vars are set, and that you've run `npm run ingest`.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-140px)] max-w-3xl flex-col px-6 py-8">
      <h1 className="text-2xl font-bold">Ask LandUK</h1>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
        Answers are grounded in curated UK government sources and cited below
        each response.
      </p>

      <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="rounded-xl border border-stone-200 dark:border-stone-800 p-3 text-left text-sm hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={
              msg.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-stone-900 px-4 py-3 text-sm text-white dark:bg-stone-100 dark:text-stone-900"
                : `mr-auto max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm ${
                    msg.error
                      ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                      : "bg-stone-100 text-stone-900 dark:bg-stone-900 dark:text-stone-100"
                  }`
            }
          >
            {msg.role === "assistant" ? (
              <div className="prose prose-sm prose-stone dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            )}
            {msg.citations && msg.citations.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-300/50 dark:border-stone-700/50 pt-2">
                {msg.citations.map((c, j) => (
                  <a
                    key={j}
                    href={c.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-white/70 dark:bg-stone-800 px-2 py-1 text-xs font-medium text-stone-700 dark:text-stone-300 hover:underline"
                  >
                    [{j + 1}] {c.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="mr-auto max-w-[85%] rounded-2xl rounded-tl-sm bg-stone-100 dark:bg-stone-900 px-4 py-3 text-sm text-stone-500">
            Thinking…
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about visas, rent, council tax…"
          className="flex-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-transparent px-4 py-3 text-sm focus:border-stone-900 dark:focus:border-stone-100 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
