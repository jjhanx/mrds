"use client";

import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Image from "next/image";
import { Send, Loader2 } from "lucide-react";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string | null; image: string | null };
}

interface ChatRoomProps {
  currentUserId: string;
}

export function ChatRoom({ currentUserId }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = () => {
    fetch("/api/chat")
      .then((res) => res.json())
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
      } else {
        const data = await res.json();
        alert(data.error || "전송에 실패했습니다.");
        setInput(content);
      }
    } catch {
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
      <div className="flex-1 bg-white rounded-xl border border-amber-100 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            아직 메시지가 없습니다. 첫 메시지를 보내보세요!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender.id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
              >
                {!isMe && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-stone-200">
                    {msg.sender.image ? (
                      <Image
                        src={msg.sender.image}
                        alt=""
                        width={32}
                        height={32}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-500 text-xs">
                        {msg.sender.name?.[0] || "?"}
                      </div>
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[75%] ${isMe ? "text-right" : ""}`}
                >
                  <div
                    className={`inline-block px-4 py-2 rounded-2xl ${
                      isMe
                        ? "bg-amber-600 text-white rounded-br-md"
                        : "bg-stone-100 text-stone-800 rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  </div>
                  <p
                    className={`text-xs text-stone-400 mt-1 ${
                      isMe ? "text-right" : ""
                    }`}
                  >
                    {!isMe && `${msg.sender.name || "익명"} · `}
                    {format(new Date(msg.createdAt), "HH:mm", { locale: ko })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지를 입력하세요..."
          className="flex-1 px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="px-4 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
}
