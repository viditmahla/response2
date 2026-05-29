import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { sendChatMessage, fetchChatHistory } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ChatWidget() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchChatHistory("default").then(h => {
      if (h?.length) setMessages(h.map(m => ({ role: m.role, content: m.content })));
    }).catch(() => {});
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMessages(p => [...p, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const res = await sendChatMessage(msg);
      setMessages(p => [...p, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "Sorry, an error occurred." }]);
    }
    setLoading(false);
  };

  return (
    <>
      <ScrollArea className="flex-1 px-5 py-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm font-medium text-gray-400 mb-1">Ask about ERW data</p>
            <p className="text-xs text-gray-300">"Which basin has the highest CDR?"</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-gray-900 text-white rounded-br-md"
                : "bg-gray-100 text-gray-800 rounded-bl-md"
            }`} data-testid={`chat-msg-${m.role}`}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </ScrollArea>
      <div className="border-t border-gray-100 p-3 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask about the data..." data-testid="chat-input"
          className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
        <button onClick={send} disabled={loading || !input.trim()} data-testid="chat-send"
          className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 disabled:opacity-30 transition-all active:scale-90">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
