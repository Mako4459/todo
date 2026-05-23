const STORAGE_KEY = "taskai.v2.state";

const defaultState = {
  tasks: [],
  categories: ["司法書士学習", "独立準備", "知識整理", "GPT壁打ち"],
  settings: {
    sort: "created-desc",
    category: "all",
    query: ""
  }
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaultState();
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch {
    return cloneDefaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
}

export function createTask(input) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    category: input.category,
    priority: input.priority || "medium",
    dueDate: input.dueDate || "",
    memo: input.memo?.trim() || "",
    completed: false,
    createdAt: now,
    updatedAt: now
  };
}

function normalizeState(state) {
  const categories = Array.isArray(state.categories) && state.categories.length
    ? [...new Set(state.categories.filter(Boolean))]
    : defaultState.categories;

  return {
    tasks: Array.isArray(state.tasks) ? state.tasks.map(normalizeTask) : [],
    categories,
    settings: {
      ...defaultState.settings,
      ...(state.settings || {})
    }
  };
}

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function normalizeTask(task) {
  return {
    id: task.id || crypto.randomUUID(),
    title: task.title || "無題のタスク",
    category: task.category || defaultState.categories[0],
    priority: ["high", "medium", "low"].includes(task.priority) ? task.priority : "medium",
    dueDate: task.dueDate || "",
    memo: task.memo || "",
    completed: Boolean(task.completed),
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: task.updatedAt || new Date().toISOString()
  };
}
