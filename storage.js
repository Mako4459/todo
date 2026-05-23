const STORAGE_KEY = "taskai-state-v1";

const defaultState = {
  tasks: [],
  categories: ["司法書士", "行政書士", "独立準備", "学習"],
  settings: {
    query: "",
    category: "all",
    sort: "created-desc",
  },
};

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(defaultState);

    const parsed = JSON.parse(saved);

    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      categories: Array.isArray(parsed.categories) && parsed.categories.length
        ? parsed.categories
        : [...defaultState.categories],
      settings: {
        ...defaultState.settings,
        ...(parsed.settings || {}),
      },
    };
  } catch (error) {
    console.warn("Failed to load state", error);
    return structuredClone(defaultState);
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createTask(task) {
  return {
    id: crypto.randomUUID(),
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: "",
    category: "学習",
    priority: "medium",
    dueDate: "",
    memo: "",
    ...task,
  };
}
