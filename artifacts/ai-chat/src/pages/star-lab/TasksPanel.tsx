import React, { useEffect, useState } from "react";
import { getApiBase } from "@/lib/api-base";
import { Clock, Plus, X, CheckCircle2, AlertCircle, Loader2, Ban } from "lucide-react";

type TaskStatus = "pending" | "running" | "done" | "failed" | "cancelled";

type SiriusTask = {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  progress: string | null;
  result: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  pending:   "hsl(45,100%,50%)",
  running:   "hsl(193,100%,50%)",
  done:      "hsl(145,70%,45%)",
  failed:    "hsl(0,80%,55%)",
  cancelled: "hsl(0,0%,45%)",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending:   "Queued",
  running:   "Running",
  done:      "Done",
  failed:    "Failed",
  cancelled: "Cancelled",
};

function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === "running") return <Loader2 size={14} style={{ color: STATUS_COLOR.running, animation: "spin 1s linear infinite" }} />;
  if (status === "done") return <CheckCircle2 size={14} style={{ color: STATUS_COLOR.done }} />;
  if (status === "failed") return <AlertCircle size={14} style={{ color: STATUS_COLOR.failed }} />;
  if (status === "cancelled") return <Ban size={14} style={{ color: STATUS_COLOR.cancelled }} />;
  return <Clock size={14} style={{ color: STATUS_COLOR.pending }} />;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function TasksPanel({ pin }: { pin: string }) {
  const [tasks, setTasks] = useState<SiriusTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const base = getApiBase();
  const headers = { "Content-Type": "application/json", "x-lab-pin": pin };

  const fetchTasks = async () => {
    try {
      const r = await fetch(`${base}lab/tasks`, { headers: { "x-lab-pin": pin } });
      if (r.ok) setTasks(await r.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  useEffect(() => {
    const hasActive = tasks.some(t => t.status === "pending" || t.status === "running");
    if (!hasActive) return;
    const id = setInterval(fetchTasks, 5000);
    return () => clearInterval(id);
  }, [tasks]);

  const createTask = async () => {
    if (!title.trim() || !description.trim() || creating) return;
    setCreating(true);
    try {
      await fetch(`${base}lab/tasks`, { method: "POST", headers, body: JSON.stringify({ title: title.trim(), description: description.trim() }) });
      setTitle(""); setDescription(""); setShowForm(false);
      await fetchTasks();
    } finally { setCreating(false); }
  };

  const cancelTask = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`${base}lab/tasks/${id}/cancel`, { method: "PUT", headers });
    fetchTasks();
  };

  const deleteTask = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`${base}lab/tasks/${id}`, { method: "DELETE", headers });
    setTasks(t => t.filter(x => x.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const active = tasks.filter(t => t.status === "pending" || t.status === "running");
  const done = tasks.filter(t => t.status === "done" || t.status === "failed" || t.status === "cancelled");

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "28px 24px", maxWidth: 820, margin: "0 auto", width: "100%" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "hsl(193,100%,70%)", display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={20} /> Background Tasks
          </h2>
          <p style={{ margin: "5px 0 0", fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
            Queue work for Sirius to complete while you're away — she'll Telegram you when done
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
            padding: "9px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer",
            border: "1px solid hsl(193,100%,35%)", background: showForm ? "hsl(193,100%,20%)" : "hsl(193,100%,12%)",
            color: "hsl(193,100%,75%)", transition: "background 0.15s",
          }}
        >
          <Plus size={14} /> New Task
        </button>
      </div>

      {showForm && (
        <div style={{
          background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 20,
          marginBottom: 24, border: "1px solid rgba(255,255,255,0.1)",
        }}>
          <input
            autoFocus
            placeholder="Task title — e.g. Research top 5 competitors in UK wellness apps"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (document.querySelector("textarea[data-task]") as HTMLElement)?.focus(); } }}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 9, fontSize: 14, marginBottom: 10,
              border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.35)",
              color: "#fff", outline: "none", boxSizing: "border-box",
            }}
          />
          <textarea
            data-task=""
            placeholder="Describe exactly what Sirius should do. Be specific — she works alone and can't ask you questions."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={5}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 9, fontSize: 13, resize: "vertical",
              border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.35)",
              color: "#fff", outline: "none", marginBottom: 14, boxSizing: "border-box", lineHeight: 1.6,
            }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => { setShowForm(false); setTitle(""); setDescription(""); }}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              onClick={createTask}
              disabled={creating || !title.trim() || !description.trim()}
              style={{
                padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: "none", cursor: (creating || !title.trim() || !description.trim()) ? "not-allowed" : "pointer",
                background: (creating || !title.trim() || !description.trim()) ? "rgba(100,200,255,0.15)" : "hsl(193,100%,30%)",
                color: "#fff",
              }}
            >
              {creating ? "Queuing…" : "Queue Task"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)" }}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite", marginBottom: 10 }} />
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: "center", padding: 70, color: "rgba(255,255,255,0.3)" }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🌙</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>No tasks yet</div>
          <div style={{ fontSize: 13, marginTop: 6, opacity: 0.7 }}>Give Sirius something to work on while you sleep</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {active.length > 0 && (
            <section>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Active</div>
              <TaskList tasks={active} expanded={expanded} setExpanded={setExpanded} onCancel={cancelTask} onDelete={deleteTask} />
            </section>
          )}
          {done.length > 0 && (
            <section>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Completed</div>
              <TaskList tasks={done} expanded={expanded} setExpanded={setExpanded} onCancel={cancelTask} onDelete={deleteTask} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function TaskList({ tasks, expanded, setExpanded, onCancel, onDelete }: {
  tasks: SiriusTask[];
  expanded: number | null;
  setExpanded: (id: number | null) => void;
  onCancel: (id: number, e: React.MouseEvent) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {tasks.map(task => (
        <div key={task.id} style={{
          borderRadius: 12, overflow: "hidden",
          border: `1px solid ${task.status === "running" ? "hsl(193,100%,25%)" : "rgba(255,255,255,0.08)"}`,
          background: task.status === "running" ? "rgba(0,180,255,0.04)" : "rgba(255,255,255,0.03)",
          transition: "border-color 0.2s",
        }}>
          <div
            style={{ padding: "13px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
            onClick={() => setExpanded(expanded === task.id ? null : task.id)}
          >
            <StatusIcon status={task.status} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>{task.title}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                  background: `${STATUS_COLOR[task.status]}22`, color: STATUS_COLOR[task.status],
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>{STATUS_LABEL[task.status]}</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 2 }}>
                Created {fmtDate(task.createdAt)}
                {task.completedAt && <span style={{ marginLeft: 8 }}>· done {fmtDate(task.completedAt)}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {(task.status === "pending" || task.status === "running") && (
                <button
                  onClick={e => onCancel(task.id, e)}
                  style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.45)" }}
                >Cancel</button>
              )}
              {(task.status === "done" || task.status === "failed" || task.status === "cancelled") && (
                <button
                  onClick={e => onDelete(task.id, e)}
                  style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", border: "1px solid rgba(255,80,80,0.25)", background: "transparent", color: "rgba(255,100,100,0.65)" }}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {expanded === task.id && (
            <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ margin: "12px 0 0", fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}>{task.description}</p>

              {task.progress && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Progress Log</div>
                  <pre style={{
                    margin: 0, fontFamily: "inherit", fontSize: 12, color: "rgba(255,255,255,0.6)",
                    whiteSpace: "pre-wrap", lineHeight: 1.7, background: "rgba(0,0,0,0.2)",
                    borderRadius: 8, padding: "10px 12px",
                  }}>{task.progress}</pre>
                </div>
              )}

              {task.result && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "hsl(145,70%,55%)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Result</div>
                  <pre style={{
                    margin: 0, fontFamily: "inherit", fontSize: 13, color: "rgba(255,255,255,0.85)",
                    whiteSpace: "pre-wrap", lineHeight: 1.7, background: "rgba(0,0,0,0.25)",
                    borderRadius: 8, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)",
                  }}>{task.result}</pre>
                </div>
              )}

              {task.error && (
                <div style={{ marginTop: 14, background: "rgba(255,50,50,0.07)", borderRadius: 8, padding: "10px 12px", border: "1px solid rgba(255,50,50,0.18)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "hsl(0,80%,65%)", marginBottom: 4 }}>Error</div>
                  <div style={{ fontSize: 12, color: "rgba(255,150,150,0.8)", lineHeight: 1.5 }}>{task.error}</div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
