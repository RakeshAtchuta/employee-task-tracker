import { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, CircleAlert, ClipboardList, Plus, Search, Trash2, X } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
const STATUSES = ["Pending", "In Progress", "Completed"];
const EMPTY_FORM = { title: "", description: "", priority: "Medium", assigned_employee: "" };

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.detail;
    throw new Error(typeof message === "string" ? message : "Request failed. Check the API server.");
  }
  return data;
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function loadTasks() {
    setLoading(true);
    setError("");
    try { setTasks(await request("/tasks")); }
    catch (e) { setError(`${e.message} Make sure FastAPI is running at ${API}.`); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadTasks(); }, []);

  const filtered = useMemo(() => tasks.filter(task => {
    const term = search.trim().toLowerCase();
    const matchesText = !term || [task.title, task.assigned_employee, task.description]
      .some(value => value?.toLowerCase().includes(term));
    const matchesStatus = statusFilter === "All statuses" || task.status === statusFilter;
    return matchesText && matchesStatus;
  }), [tasks, search, statusFilter]);

  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => t.status === "Pending").length,
    progress: tasks.filter(t => t.status === "In Progress").length,
    completed: tasks.filter(t => t.status === "Completed").length,
  }), [tasks]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
    setError("");
    setNotice("");
  }
  function openEdit(task) {
    setEditing(task);
    setForm({ title: task.title, description: task.description || "", priority: task.priority,
      assigned_employee: task.assigned_employee });
    setModalOpen(true);
    setError("");
    setNotice("");
  }
  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }
  function updateField(event) {
    setForm(prev => ({ ...prev, [event.target.name]: event.target.value }));
  }

  async function submitTask(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = { ...form, title: form.title.trim(), assigned_employee: form.assigned_employee.trim() };
      if (!payload.title || !payload.assigned_employee) throw new Error("Please complete the title and assigned employee.");
      if (editing) {
        await request(`/tasks/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setNotice("Task updated successfully.");
      } else {
        await request("/tasks", { method: "POST", body: JSON.stringify(payload) });
        setNotice("Task created successfully.");
      }
      closeModal();
      await loadTasks();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function changeStatus(task, nextStatus) {
    setError(""); setNotice("");
    try {
      const updated = await request(`/tasks/${task.id}/status`, {
        method: "PATCH", body: JSON.stringify({ status: nextStatus }),
      });
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      setNotice(`Task status changed to ${nextStatus}.`);
    } catch (e) { setError(e.message); }
  }

  async function removeTask(task) {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    setError(""); setNotice("");
    try {
      await request(`/tasks/${task.id}`, { method: "DELETE" });
      setTasks(prev => prev.filter(t => t.id !== task.id));
      setNotice("Task deleted successfully.");
    } catch (e) { setError(e.message); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><ClipboardList size={22}/></div><div><b>TaskPilot</b><small>WORKSPACE</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      <div className="nav-item active"><ClipboardList size={18}/> Task dashboard</div>
      <div className="sidebar-bottom"><div className="avatar">ET</div><div><b>Employee Team</b><small>Task management</small></div></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="crumb">Workspace <span>/</span> <b>Task dashboard</b></div><div className="live-tag"><span/> Workspace overview</div></header>
      <section className="page-heading">
        <div><div className="eyebrow">OVERVIEW</div><h1>Employee tasks</h1><p>Plan, assign, and track your team's work in one place.</p></div>
        <button className="primary-btn" onClick={openCreate}><Plus size={18}/> Create task</button>
      </section>

      {error && <div className="alert error"><CircleAlert size={18}/><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError("")}><X size={16}/></button></div>}
      {notice && <div className="alert success"><CheckCircle2 size={18}/><span>{notice}</span><button aria-label="Dismiss notice" onClick={() => setNotice("")}><X size={16}/></button></div>}

      <section className="stats-grid">
        <Stat title="Total tasks" value={stats.total} icon={<ClipboardList/>} tone="blue" foot="Across your workspace"/>
        <Stat title="Pending" value={stats.pending} icon={<Activity/>} tone="amber" foot="Waiting to get started"/>
        <Stat title="In progress" value={stats.progress} icon={<Activity/>} tone="violet" foot="Currently being worked on"/>
        <Stat title="Completed" value={stats.completed} icon={<CheckCircle2/>} tone="green" foot="Successfully finished"/>
      </section>

      <section className="panel">
        <div className="panel-header"><div><h2>Task list</h2><p>View and manage tasks assigned to your employees.</p></div><span className="count-pill">{filtered.length} tasks</span></div>
        <div className="toolbar">
          <div className="searchbox"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks or employees..." aria-label="Search tasks or employees"/></div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option>All statuses</option>{STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="secondary-btn" onClick={loadTasks}>Refresh</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>TASK</th><th>ASSIGNED TO</th><th>PRIORITY</th><th>STATUS</th><th className="action-head">ACTIONS</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="5" className="empty"><div className="loader"/>Loading tasks...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan="5" className="empty"><div className="empty-icon"><ClipboardList/></div><b>No tasks found</b><span>Create a task or adjust your search filters.</span></td></tr>
              : filtered.map(task => <tr key={task.id}>
                <td><div className="task-title">{task.title}</div><div className="task-description">{task.description || "No description provided"}</div><div className="task-id">TASK-{String(task.id).padStart(4, "0")}</div></td>
                <td><div className="person"><span className="person-avatar">{initials(task.assigned_employee)}</span><span>{task.assigned_employee}</span></div></td>
                <td><span className={`priority ${task.priority.toLowerCase()}`}><i/>{task.priority}</span></td>
                <td><select className={`status-select ${statusClass(task.status)}`} value={task.status} onChange={e => changeStatus(task, e.target.value)} aria-label={`Change status for ${task.title}`}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></td>
                <td><div className="row-actions"><button title="Edit task" aria-label={`Edit ${task.title}`} onClick={() => openEdit(task)} className="edit-btn">Edit</button><button title="Delete task" aria-label={`Delete ${task.title}`} onClick={() => removeTask(task)} className="delete-btn"><Trash2 size={16}/></button></div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>Data is saved in the local SQLite database.</span><span>Showing {filtered.length} of {tasks.length} tasks</span></div>
      </section>
      <footer>TaskPilot · Employee Task Tracker <span>Built for productive teamwork</span></footer>
    </main>

    {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header"><div><div className="eyebrow">{editing ? "TASK DETAILS" : "NEW TASK"}</div><h2 id="modal-title">{editing ? "Edit task" : "Create a task"}</h2><p>{editing ? "Update task information." : "Add a task and assign it to a team member."}</p></div><button className="icon-btn" onClick={closeModal} aria-label="Close"><X/></button></div>
        <form onSubmit={submitTask} className="task-form">
          <label>Task title <em>*</em><input name="title" value={form.title} onChange={updateField} maxLength="120" placeholder="e.g. Prepare monthly report" required autoFocus/></label>
          <label>Description<textarea name="description" value={form.description} onChange={updateField} maxLength="1000" rows="3" placeholder="Add context or key details (optional)"/></label>
          <div className="form-row">
            <label>Priority<select name="priority" value={form.priority} onChange={updateField}><option>Low</option><option>Medium</option><option>High</option></select></label>
            <label>Assigned employee <em>*</em><input name="assigned_employee" value={form.assigned_employee} onChange={updateField} maxLength="120" placeholder="Employee name" required/></label>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions"><button type="button" className="secondary-btn" onClick={closeModal}>Cancel</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saving..." : editing ? "Save changes" : "Create task"}</button></div>
        </form>
      </section>
    </div>}
  </div>;
}

function Stat({title, value, icon, tone, foot}) {
  return <article className="stat-card"><div className="stat-top"><span>{title}</span><span className={`stat-icon ${tone}`}>{icon}</span></div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></article>;
}
function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase() || "EM";
}
function statusClass(status) {
  return status === "Completed" ? "done" : status === "In Progress" ? "working" : "waiting";
}

export default App;
