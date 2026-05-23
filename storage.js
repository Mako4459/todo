const STORAGE_KEY = "taskai-state-v3";

export const defaultState = {
  tasks: [],
  categories: ["司法書士学習", "独立準備", "知識整理", "GPT壁打ち"],
  settings: {
    query: "",
    category: "all",
    sort: "created-desc",
    view: "list"
  }
};

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return cloneDefaultState();
    return normalizeState(JSON.parse(saved));
  } catch (error) {
    console.warn("TaskAI: localStorageの復元に失敗しました", error);
    return cloneDefaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
    return true;
  } catch (error) {
    console.warn("TaskAI: localStorageの保存に失敗しました", error);
    return false;
  }
}

export function createTask(input = {}) {
  const now = new Date().toISOString();
  return normalizeTask({
    id: createId(),
    title: "",
    category: defaultState.categories[0],
    priority: "medium",
    dueDate: "",
    memo: "",
    completed: false,
    createdAt: now,
    updatedAt: now,
    ...input
  });
}

export function normalizeState(value) {
  const state = value && typeof value === "object" ? value : {};
  const categories = normalizeCategories(state.categories);
  const tasks = Array.isArray(state.tasks)
    ? state.tasks.map((task) => normalizeTask(task, categories)).filter((task) => task.title)
    : [];

  return {
    tasks,
    categories: mergeCategories(categories, tasks.map((task) => task.category)),
    settings: {
      ...defaultState.settings,
      ...(state.settings && typeof state.settings === "object" ? state.settings : {})
    }
  };
}

function normalizeTask(task, categories = defaultState.categories) {
  const now = new Date().toISOString();
  const title = String(task?.title || "").trim();
  const priority = ["high", "medium", "low"].includes(task?.priority) ? task.priority : "medium";
  const category = String(task?.category || categories[0] || defaultState.categories[0]).trim();

  return {
    id: String(task?.id || createId()),
    title,
    category,
    priority,
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(task?.dueDate || "") ? task.dueDate : "",
    memo: String(task?.memo || ""),
    completed: Boolean(task?.completed),
    createdAt: task?.createdAt || now,
    updatedAt: task?.updatedAt || now
  };
}

function normalizeCategories(categories) {
  const source = Array.isArray(categories) ? categories : defaultState.categories;
  return mergeCategories(source.map((category) => String(category || "").trim()).filter(Boolean));
}

function mergeCategories(...groups) {
  return [...new Set(groups.flat().filter(Boolean))];
}

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function createId() {
  return crypto?.randomUUID ? crypto.randomUUID() : `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
