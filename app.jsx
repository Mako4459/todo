import { useState, useRef, useEffect } from "react";

const COLORS = {
  bg: "#0f0e17",
  surface: "#1a1828",
  card: "#221f35",
  accent: "#ff6b6b",
  accent2: "#ffd166",
  accent3: "#06d6a0",
  text: "#fffffe",
  muted: "#a7a9be",
  border: "#2e2b45",
};

const CATEGORY_COLORS = {
  仕事: "#ff6b6b",
  個人: "#ffd166",
  学習: "#06d6a0",
  その他: "#a78bfa",
};

const PRIORITY_LABELS = { high: "高", mid: "中", low: "低" };
const PRIORITY_COLORS = { high: "#ff6b6b", mid: "#ffd166", low: "#06d6a0" };

function Tag({ label, color }) {
  return (
    <span style={{
      background: color + "22",
      color,
      border: `1px solid ${color}55`,
      borderRadius: 6,
      padding: "2px 10px",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 1,
      textTransform: "uppercase",
    }}>{label}</span>
  );
}

function TaskCard({ task, onSelect, selected }) {
  return (
    <div
      onClick={() => onSelect(task)}
      style={{
        background: selected ? COLORS.card : COLORS.surface,
        border: `1.5px solid ${selected ? COLORS.accent : COLORS.border}`,
        borderRadius: 14,
        padding: "14px 18px",
        cursor: "pointer",
        marginBottom: 10,
        transition: "all 0.2s",
        boxShadow: selected ? `0 0 0 2px ${COLORS.accent}44` : "none",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 15, flex: 1 }}>{task.title}</span>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <Tag label={PRIORITY_LABELS[task.priority]} color={PRIORITY_COLORS[task.priority]} />
          <Tag label={task.category} color={CATEGORY_COLORS[task.category] || "#a78bfa"} />
        </div>
      </div>
      {task.description && (
        <p style={{ color: COLORS.muted, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{task.description}</p>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
        <span style={{ color: COLORS.muted, fontSize: 11 }}>
          {task.chatHistory?.length > 0 ? `💬 ${task.chatHistory.length}件の相談` : "未相談"}
        </span>
      </div>
    </div>
  );
}

function ChatBubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 12,
    }}>
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: `linear-gradient(135deg, ${COLORS.accent}, #a78bfa)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, marginRight: 8, flexShrink: 0, marginTop: 2,
        }}>✦</div>
      )}
      <div style={{
        maxWidth: "80%",
        background: isUser
          ? `linear-gradient(135deg, ${COLORS.accent}cc, #a78bfa99)`
          : COLORS.card,
        border: isUser ? "none" : `1px solid ${COLORS.border}`,
        color: COLORS.text,
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        padding: "10px 14px",
        fontSize: 14,
        lineHeight: 1.7,
        whiteSpace: "pre-wrap",
      }}>
        {content}
      </div>
    </div>
  );
}

function AddTaskModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ title: "", description: "", priority: "mid", category: "仕事" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle = {
    width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
    borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontSize: 14,
    outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  };
  const labelStyle = { color: COLORS.muted, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, display: "block" };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000088", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 20,
        padding: 28, width: "100%", maxWidth: 460,
        boxShadow: "0 20px 60px #00000099",
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ color: COLORS.text, margin: "0 0 20px", fontSize: 20, fontWeight: 800 }}>
          ＋ タスクを追加
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>タイトル</label>
            <input style={inputStyle} placeholder="タスク名を入力..." value={form.title} onChange={e => set("title", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>詳細（任意）</label>
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} placeholder="困っていること、状況など..." value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>優先度</label>
              <select style={inputStyle} value={form.priority} onChange={e => set("priority", e.target.value)}>
                <option value="high">高</option>
                <option value="mid">中</option>
                <option value="low">低</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>カテゴリ</label>
              <select style={inputStyle} value={form.category} onChange={e => set("category", e.target.value)}>
                {Object.keys(CATEGORY_COLORS).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${COLORS.border}`,
            background: "transparent", color: COLORS.muted, cursor: "pointer", fontSize: 14, fontWeight: 600,
          }}>キャンセル</button>
          <button
            onClick={() => { if (form.title.trim()) { onAdd(form); onClose(); } }}
            style={{
              flex: 2, padding: "12px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${COLORS.accent}, #a78bfa)`,
              color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700,
            }}>追加する</button>
        </div>
      </div>
    </div>
  );
}

// ── Mobile-first PWA App ──────────────────────────────────────────────
export default function App() {
  // "list" | "chat"
  const [screen, setScreen] = useState("list");
  const [tasks, setTasks] = useState([
    { id: 1, title: "プレゼン資料が完成しない", description: "明日の会議に間に合わせないといけないが、何から手をつければいいか...", priority: "high", category: "仕事", chatHistory: [] },
    { id: 2, title: "英語の勉強が続かない", description: "毎日やろうと決めても3日坊主になってしまう", priority: "mid", category: "学習", chatHistory: [] },
  ]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [selectedTask?.chatHistory, loading]);

  const selectTask = (task) => {
    setSelectedTask(task);
    setScreen("chat");
  };

  const addTask = (form) => {
    const task = { ...form, id: Date.now(), chatHistory: [] };
    setTasks(ts => [...ts, task]);
    setSelectedTask(task);
    setScreen("chat");
  };

  const updateTask = (id, updates) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, ...updates } : t));
    setSelectedTask(prev => prev?.id === id ? { ...prev, ...updates } : prev);
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedTask || loading) return;
    const userMsg = input.trim();
    setInput("");
    setLoading(true);

    const newHistory = [...(selectedTask.chatHistory || []), { role: "user", content: userMsg }];
    updateTask(selectedTask.id, { chatHistory: newHistory });

    const systemPrompt = `あなたはタスク解消の専門コンサルタントです。ユーザーが抱えているタスクや悩みに対して、具体的・実践的な解決策を提案してください。

現在のタスク情報:
- タイトル: ${selectedTask.title}
- 詳細: ${selectedTask.description || "（未記入）"}
- 優先度: ${PRIORITY_LABELS[selectedTask.priority]}
- カテゴリ: ${selectedTask.category}

会話を通じて状況を深掘りし、実行可能なアクションプランを提示してください。共感的で親身な姿勢で、ステップバイステップのアドバイスを心がけてください。回答は200文字程度を目安に、簡潔にまとめてください。`;

    const messages = newHistory.map(m => ({ role: m.role, content: m.content }));
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages }),
      });
      const data = await res.json();
      const reply = data.content?.map(b => b.text || "").join("") || "エラーが発生しました";
      updateTask(selectedTask.id, { chatHistory: [...newHistory, { role: "assistant", content: reply }] });
    } catch {
      updateTask(selectedTask.id, { chatHistory: [...newHistory, { role: "assistant", content: "通信エラーが発生しました。もう一度お試しください。" }] });
    }
    setLoading(false);
  };

  const startChat = async (task) => {
    if (!task || loading || (task.chatHistory || []).length > 0) return;
    setLoading(true);
    const systemPrompt = `あなたはタスク解消の専門コンサルタントです。

現在のタスク:
- タイトル: ${task.title}
- 詳細: ${task.description || "（未記入）"}
- 優先度: ${PRIORITY_LABELS[task.priority]}
- カテゴリ: ${task.category}

まず一言共感を示してから、状況を深掘りする質問を1〜2個してください。150文字以内で。`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages: [{ role: "user", content: "相談を始めます。" }] }),
      });
      const data = await res.json();
      const reply = data.content?.map(b => b.text || "").join("") || "こんにちは！";
      updateTask(task.id, { chatHistory: [{ role: "assistant", content: reply }] });
    } catch {
      updateTask(task.id, { chatHistory: [{ role: "assistant", content: "こんにちは！このタスクについて一緒に考えましょう。何が一番難しいと感じていますか？" }] });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedTask && (selectedTask.chatHistory || []).length === 0) {
      startChat(selectedTask);
    }
  }, [selectedTask?.id]);

  // ── Shared styles ──
  const headerH = 56;
  const bottomH = 60;

  // ══════════════════════════════════════════════
  // SCREEN: LIST
  // ══════════════════════════════════════════════
  if (screen === "list") {
    return (
      <div style={{ height: "100dvh", background: COLORS.bg, display: "flex", flexDirection: "column", fontFamily: "'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ height: headerH, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
            <span style={{ background: `linear-gradient(90deg,${COLORS.accent},#a78bfa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>TaskAI</span>
          </h1>
          <button onClick={() => setShowModal(true)} style={{ background: `linear-gradient(135deg,${COLORS.accent},#a78bfa)`, border: "none", borderRadius: 22, padding: "8px 20px", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            ＋ 追加
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px", WebkitOverflowScrolling: "touch" }}>
          <div style={{ color: COLORS.muted, fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>
            タスク一覧 ({tasks.length})
          </div>
          {tasks.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: COLORS.muted }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>✦</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>タスクを追加して</div>
              <div style={{ fontSize: 13 }}>AIと一緒に解消しよう</div>
            </div>
          )}
          {tasks.map(t => (
            <TaskCard key={t.id} task={t} onSelect={selectTask} selected={false} />
          ))}
        </div>

        {showModal && <AddTaskModal onAdd={addTask} onClose={() => setShowModal(false)} />}
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // SCREEN: CHAT
  // ══════════════════════════════════════════════
  return (
    <div style={{ height: "100dvh", background: COLORS.bg, display: "flex", flexDirection: "column", fontFamily: "'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ height: headerH, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0, background: COLORS.surface }}>
        <button onClick={() => setScreen("list")} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 22, cursor: "pointer", padding: "4px 8px 4px 0", lineHeight: 1 }}>‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: COLORS.text, fontWeight: 800, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedTask?.title}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
            <Tag label={PRIORITY_LABELS[selectedTask?.priority]} color={PRIORITY_COLORS[selectedTask?.priority]} />
            <Tag label={selectedTask?.category} color={CATEGORY_COLORS[selectedTask?.category] || "#a78bfa"} />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 8px", WebkitOverflowScrolling: "touch" }}>
        {(selectedTask?.chatHistory || []).map((msg, i) => (
          <ChatBubble key={i} role={msg.role} content={msg.content} />
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${COLORS.accent},#a78bfa)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>✦</div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "16px 16px 16px 4px", padding: "10px 14px" }}>
              <span style={{ color: COLORS.muted, fontSize: 18, letterSpacing: 4 }}>•••</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 8, background: COLORS.surface, alignItems: "flex-end", paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"; }}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && (e.preventDefault(), sendMessage())}
          placeholder="メッセージを入力..."
          rows={1}
          style={{ flex: 1, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "10px 14px", color: COLORS.text, fontSize: 15, outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.5, overflow: "hidden", maxHeight: 100 }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: input.trim() && !loading ? `linear-gradient(135deg,${COLORS.accent},#a78bfa)` : COLORS.border, color: "#fff", fontSize: 18, cursor: input.trim() && !loading ? "pointer" : "default", flexShrink: 0, transition: "background 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }}>
          ↑
        </button>
      </div>

      {showModal && <AddTaskModal onAdd={addTask} onClose={() => setShowModal(false)} />}
    </div>
  );
}
