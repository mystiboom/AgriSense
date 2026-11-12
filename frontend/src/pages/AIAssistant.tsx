import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Plus,
  Send,
  User,
  Leaf,
  MessageSquare,
  Trash2,
  Sprout,
  Loader2,
  ChevronDown,
  BookOpen,
} from "lucide-react";

import {
    sendChatMessage,
    getConversations,
    getConversationMessages,
    deleteSavedConversation,
  } from "../services/api";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: {
    document_id: number;
    title: string;
    category: string | null;
    source: string | null;
    similarity: number;
  }[];
};

type Conversation = {
  id: string;
  title: string;
  regionId: number | null;
  messages: Message[];
  updatedAt: number;
};

const STORAGE_KEY = "agrisense_conversations";

const regions = [
  { id: null, name: "All Fields / District" },
  { id: 2, name: "North Block" },
  { id: 3, name: "South Block" },
  { id: 5, name: "Field N1" },
  { id: 4, name: "Field N2" },
  { id: 7, name: "Field S1" },
  { id: 6, name: "Field S2" },
];

const suggestions = [
  "Show me the latest crop health status.",
  "Which field is experiencing the highest stress?",
  "Compare the NDVI of all four fields.",
  "What could be causing low soil moisture?",
];

function createConversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: "New conversation",
    regionId: null,
    messages: [],
    updatedAt: Date.now(),
  };
}

export default function AIAssistant() {
  const [conversations, setConversations] = useState<Conversation[]>(
    () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
  );

  const [activeId, setActiveId] = useState<string | null>(
    () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed: Conversation[] = saved
          ? JSON.parse(saved)
          : [];
        return parsed[0]?.id ?? null;
      } catch {
        return null;
      }
    }
  );

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadConversation = async (id: string) => {
  setActiveId(id);
  setLoadingHistory(true);

  try {
    const response = await getConversationMessages(id);

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === id
          ? {
              ...conversation,
              regionId: response.region_id,
              messages: response.messages.map((message) => ({
                id: message.id,
                role: message.role,
                content: message.content,
                sources: message.sources ?? [],
              })),
              updatedAt: Date.now(),
            }
          : conversation
      )
    );
  } catch (error) {
    console.error("Could not load conversation:", error);
  } finally {
    setLoadingHistory(false);
  }
};

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeId
  );

  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(conversations)
    );
  }, [conversations]);

  useEffect(() => {
    let cancelled = false;

    const restoreConversations = async () => {
      try {
        const savedConversations = await getConversations();

        if (cancelled) return;

        const cached: Conversation[] = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || "[]"
        );

        const restored: Conversation[] = savedConversations.map(
          (item) => {
            const old = cached.find(
              (conversation) => conversation.id === item.id
            );

            return {
              id: item.id,
              title: item.title,
              regionId: item.region_id,
              messages: old?.messages ?? [],
              updatedAt: new Date(item.updated_at).getTime(),
            };
          }
        );

        setConversations(restored);

        const selected =
          restored.find((item) => item.id === activeId) ??
          restored[0];

        if (selected) {
          setActiveId(selected.id);

          const response = await getConversationMessages(
            selected.id
          );

          if (cancelled) return;

          setConversations((previous) =>
            previous.map((conversation) =>
              conversation.id === selected.id
                ? {
                    ...conversation,
                    regionId: response.region_id,
                    messages: response.messages.map((message) => ({
                      id: message.id,
                      role: message.role,
                      content: message.content,
                      sources: message.sources ?? [],
                    })),
                  }
                : conversation
            )
          );
        } else {
          setActiveId(null);
        }
      } catch (error) {
        console.error("Could not restore chat history:", error);
      }
    };

    restoreConversations();

    return () => {
      cancelled = true;
    };
    // Run only when the assistant page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNewChat = () => {
    const conversation = createConversation();

    setConversations((previous) => [
      conversation,
      ...previous,
    ]);

    setActiveId(conversation.id);
    setInput("");
  };

  const deleteConversation = async (
    event: React.MouseEvent,
    id: string
  ) => {
    event.stopPropagation();

    const conversation = conversations.find(
      (item) => item.id === id
    );

    if (!conversation) return;

    try {
      // Only persisted conversations need a backend delete.
      if (conversation.messages.length > 0) {
        await deleteSavedConversation(id);
      }

      const remaining = conversations.filter(
        (item) => item.id !== id
      );

      setConversations(remaining);

      if (activeId === id) {
        setActiveId(remaining[0]?.id ?? null);

        if (remaining[0]) {
          await loadConversation(remaining[0].id);
        }
      }
    } catch (error) {
      console.error("Could not delete conversation:", error);
      alert("Unable to delete this conversation. Please try again.");
    }
  };

  const updateConversation = (
    id: string,
    updater: (conversation: Conversation) => Conversation
  ) => {
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === id
          ? updater(conversation)
          : conversation
      )
    );
  };

  const handleSend = async (text?: string) => {
    const question = (text ?? input).trim();

    if (!question || loading) return;

    let conversation = activeConversation;

    if (!conversation) {
      conversation = createConversation();

      setConversations((previous) => [
        conversation!,
        ...previous,
      ]);

      setActiveId(conversation.id);
    }

    const conversationId = conversation.id;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };

    const isFirstMessage = conversation.messages.length === 0;

    updateConversation(conversationId, (current) => ({
      ...current,
      title: isFirstMessage
        ? question.slice(0, 35) +
          (question.length > 35 ? "..." : "")
        : current.title,
      messages: [...current.messages, userMessage],
      updatedAt: Date.now(),
    }));

    setInput("");
    setLoading(true);

    try {
      const response = await sendChatMessage({
        question,
        region_id: conversation.regionId,
        top_k: 5,
        conversation_id: conversationId,
      });

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.answer,
        sources: response.sources,
      };

      updateConversation(conversationId, (current) => ({
        ...current,
        id: response.conversation_id,
        messages: [
          ...current.messages,
          assistantMessage,
        ],
        updatedAt: Date.now(),
      }));

    } catch (error) {
      console.error("Chat error:", error);

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "I'm sorry, I couldn't process your request. Please check whether the AgriSense backend is running and try again.",
      };

      updateConversation(conversationId, (current) => ({
        ...current,
        messages: [...current.messages, errorMessage],
      }));

    } finally {
      setLoading(false);
    }
  };

  const selectedRegion = activeConversation?.regionId ?? null;

  const handleRegionChange = (value: string) => {
    if (!activeId) return;

    updateConversation(activeId, (current) => ({
      ...current,
      regionId: value === "" ? null : Number(value),
    }));
  };

  return (
    <main className="flex-1 min-w-0 flex h-screen overflow-hidden bg-[#F5F8F4]">

      {/* Conversation sidebar */}
      <aside className="w-72 shrink-0 bg-white border-r border-gray-200 flex flex-col">

        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <div className="bg-[#B9E769] p-2 rounded-lg">
              <Leaf size={21} className="text-[#10271D]" />
            </div>

            <div>
              <h2 className="font-bold text-[#183729]">
                AgriSense AI
              </h2>
              <p className="text-xs text-gray-400">
                Agricultural Intelligence
              </p>
            </div>
          </div>

          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 bg-[#183729] text-white rounded-xl py-3 text-sm font-medium hover:bg-[#254D38] transition"
          >
            <Plus size={18} />
            New conversation
          </button>
        </div>

        <div className="px-4 py-4 flex-1 overflow-y-auto">

          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">
            Recent conversations
          </p>

          <div className="space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => loadConversation(conversation.id)}
                className={`w-full flex items-center gap-2 p-3 rounded-xl text-left group transition ${
                  activeId === conversation.id
                    ? "bg-[#EDF5E6] text-[#183729]"
                    : "hover:bg-gray-50 text-gray-600"
                }`}
              >
                <MessageSquare
                  size={16}
                  className="shrink-0"
                />

                <span className="text-sm truncate flex-1">
                  {conversation.title}
                </span>

                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) =>
                    deleteConversation(event, conversation.id)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      deleteConversation(
                        event as unknown as React.MouseEvent,
                        conversation.id
                      );
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={15} />
                </span>
              </button>
            ))}

            {conversations.length === 0 && (
              <p className="text-xs text-gray-400 py-4 text-center">
                No conversations yet.
              </p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            AI system operational
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <section className="flex-1 min-w-0 flex flex-col">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">

          <div>
            <p className="text-xs text-gray-400">
              Agricultural Intelligence / AI Assistant
            </p>

            <h1 className="text-xl font-bold text-[#183729] mt-1">
              Agricultural AI Assistant
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Connected
          </div>
        </header>

        {/* Region selector */}
        <div className="px-8 py-3 bg-white border-b border-gray-100 flex items-center gap-3">

          <Sprout size={18} className="text-[#4C9369]" />

          <label className="text-sm text-gray-500">
            Agricultural context:
          </label>

          <div className="relative">
            <select
              value={selectedRegion ?? ""}
              onChange={(event) =>
                handleRegionChange(event.target.value)
              }
              className="appearance-none bg-[#F5F8F4] border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-[#183729] outline-none focus:border-green-500"
            >
              {regions.map((region) => (
                <option
                  key={region.name}
                  value={region.id ?? ""}
                >
                  {region.name}
                </option>
              ))}
            </select>

            <ChevronDown
              size={15}
              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8">

          <div className="max-w-4xl mx-auto">

            {loadingHistory ? (
                <div className="min-h-[450px] flex items-center justify-center gap-3 text-gray-500">
                    <Loader2 size={20} className="animate-spin" />
                    Loading conversation history...
                </div>
            ) : messages.length === 0 ? (
              <div className="min-h-[450px] flex flex-col justify-center">

                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-[#E9F5DF] rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <Bot
                      size={34}
                      className="text-[#3C8156]"
                    />
                  </div>

                  <h2 className="text-2xl font-bold text-[#183729]">
                    How can I help your farm today?
                  </h2>

                  <p className="text-gray-500 mt-2">
                    Ask me about crop health, soil conditions,
                    weather, and agricultural recommendations.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSend(suggestion)}
                      className="bg-white border border-gray-200 rounded-xl p-4 text-left text-sm text-gray-600 hover:border-green-400 hover:bg-green-50 transition"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-7">

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user"
                        ? "flex-row-reverse"
                        : ""
                    }`}
                  >
                    <div
                      className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
                        message.role === "user"
                          ? "bg-[#183729] text-white"
                          : "bg-[#E9F5DF] text-[#3C8156]"
                      }`}
                    >
                      {message.role === "user" ? (
                        <User size={19} />
                      ) : (
                        <Bot size={19} />
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-4 ${
                        message.role === "user"
                          ? "bg-[#183729] text-white rounded-tr-sm"
                          : "bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm"
                      }`}
                    >
                      <div className="text-sm leading-7 break-words">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                h3: ({ children }) => (
                                    <h3 className="text-base font-bold text-[#183729] mt-5 mb-2">
                                    {children}
                                    </h3>
                                ),
                                h2: ({ children }) => (
                                    <h2 className="text-lg font-bold text-[#183729] mt-5 mb-2">
                                    {children}
                                    </h2>
                                ),
                                p: ({ children }) => (
                                    <p className="mb-3 last:mb-0">
                                    {children}
                                    </p>
                                ),
                                ul: ({ children }) => (
                                    <ul className="list-disc pl-5 space-y-1 mb-3">
                                    {children}
                                    </ul>
                                ),
                                ol: ({ children }) => (
                                    <ol className="list-decimal pl-5 space-y-1 mb-3">
                                    {children}
                                    </ol>
                                ),
                                li: ({ children }) => (
                                    <li className="pl-1">{children}</li>
                                ),
                                strong: ({ children }) => (
                                    <strong className="font-semibold text-[#183729]">
                                    {children}
                                    </strong>
                                ),
                                hr: () => (
                                    <hr className="my-4 border-gray-200" />
                                ),
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>

                      {message.sources &&
                        message.sources.length > 0 && (
                          <div className="mt-5 pt-4 border-t border-gray-100">

                            <div className="flex items-center gap-2 text-xs font-semibold text-[#3C8156] mb-3">
                              <BookOpen size={15} />
                              Knowledge sources
                            </div>

                            <div className="space-y-2">
                              {message.sources.map((source) => (
                                <div
                                  key={source.document_id}
                                  className="bg-[#F5F8F4] rounded-lg p-3"
                                >
                                  <p className="text-xs font-semibold text-[#183729]">
                                    {source.title}
                                  </p>

                                  <p className="text-xs text-gray-400 mt-1">
                                    {source.category ?? "Agriculture"}
                                    {" · "}
                                    Similarity:{" "}
                                    {(source.similarity * 100).toFixed(1)}%
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-3 text-gray-500 text-sm">
                    <div className="w-9 h-9 rounded-xl bg-[#E9F5DF] flex items-center justify-center">
                      <Bot
                        size={19}
                        className="text-[#3C8156]"
                      />
                    </div>

                    <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-3">
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                      Analyzing agricultural data...
                    </div>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="bg-white border-t border-gray-200 px-6 md:px-12 py-5">

          <div className="max-w-4xl mx-auto">

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSend();
              }}
              className="flex items-end gap-3 bg-[#F5F8F4] border border-gray-200 rounded-2xl p-3 focus-within:border-green-400"
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask anything about your crops..."
                rows={2}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-[#183729] placeholder:text-gray-400 px-2 py-2"
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-11 h-11 rounded-xl bg-[#183729] text-white flex items-center justify-center hover:bg-[#254D38] disabled:opacity-40 transition"
              >
                <Send size={19} />
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-3">
              AgriSense AI can make mistakes. Verify critical
              agricultural decisions with field observations.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
