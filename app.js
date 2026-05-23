import { createTask, loadState, saveState } from "./storage.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const priorityLabel = {
  high: "高",
  medium: "中",
  low: "低"
};

const priorityRank = {
  high: 3,
  medium: 2,
  low: 1
};

const templateQuestions = [
  "この悩みを今日やるタスクに分解して",
  "司法書士試験の論点として整理して",
  "独立準備の次の一手を3つ出して",
  "このメモから復習カードを作って",
  "詰まっている理由を質問で掘り下げて"
];

let state = loadState();
let deferredInstallPrompt = null;
let memoSaveTimer = null;

const els = {
  form: $("#taskForm"),
  title: $("#taskTitle"),
  category: $("#taskCategory"),
  dueDate: $("#taskDueDate"),
  priority: $("#taskPriority"),
  memo: $("#taskMemo"),
  addCategory: $("#addCategoryButton"),
  search: $("#searchInput"),
  categoryFilter: $("#categoryFilter"),
  sort: $("#sortSelect"),
  taskList: $("#taskList"),
  todayTasks: $("#todayTasks"),
  taskTemplate: $("#taskTemplate"),
  completionRate: $("#completionRate"),
  todaySummary: $("#todaySummary"),
  todayCount: $("#todayCount"),
  taskCount: $("#taskCount"),
  templateQuestions: $("#templateQuestions"),
  askChatGpt: $("#askChatGptButton"),
  install: $("#installButton")
};

init();

function init() {
  renderTemplates();
  bindEvents();
  render();
  registerServiceWorker();
}

function bindEvents() {
  els.form.addEventListener("submit", addTask);
  els.addCategory.addEventListener("click", addCategory);
  els.search.addEventListener("input", updateSearch);
  els.categoryFilter.addEventListener("change", updateCategoryFilter);
  els.sort.addEventListener("change", updateSort);
  els.askChatGpt.addEventListener("click", () => openChatGpt(buildQuestionPrompt()));
  els.install.addEventListener("click", installPwa);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    els.install.hidden = false;
  });
}

function addTask(event) {
  event.preventDefault();
  if (!els.title.value.trim()) return;

  state.tasks.unshift(createTask({
    title: els.title.value,
    category: els.category.value,
    priority: els.priority.value,
    dueDate: els.dueDate.value,
    memo: els.memo.value
  }));

  persist();
  els.form.reset();
  els.priority.value = "medium";
  render();
}

function addCategory() {
  const name = prompt("追加するカテゴリ名");
  const category = name?.trim();
  if (!category || state.categories.includes(category)) return;
  state.categories.push(category);
  state.settings.category = category;
  persist();
  render();
  els.category.value = category;
}

function updateSearch() {
  state.settings.query = els.search.value;
  persist();
  renderTasks();
}

function updateCategoryFilter() {
  state.settings.category = els.categoryFilter.value;
  persist();
  renderTasks();
}

function updateSort() {
  state.settings.sort = els.sort.value;
  persist();
  renderTasks();
}

function render() {
  renderCategoryOptions();
  renderStats();
  renderTasks();
}

function renderCategoryOptions() {
  els.category.innerHTML = state.categories.map(optionHtml).join("");
  els.categoryFilter.innerHTML = [
    `<option value="all">すべてのカテゴリ</option>`,
    ...state.categories.map(optionHtml)
  ].join("");

  els.search.value = state.settings.query || "";
  els.categoryFilter.value = state.settings.category || "all";
  els.sort.value = state.settings.sort || "created-desc";
}

function renderStats() {
  const total = state.tasks.length;
  const completed = state.tasks.filter((task) => task.completed).length;
  const rate = total ? Math.round((completed / total) * 100) : 0;
  const today = getTodayTasks(state.tasks);

  els.completionRate.textContent = `${rate}%`;
  els.todayCount.textContent = today.length;
  els.taskCount.textContent = state.tasks.length;
  els.todaySummary.textContent = today.length
    ? `今日のタスク ${today.length}件。完了 ${today.filter((task) => task.completed).length}件。`
    : "今日のタスクはありません。";

  $(".progress-ring").style.setProperty("--progress", `${rate}%`);
}

function renderTasks() {
  const filtered = getVisibleTasks();
  const today = getTodayTasks(filtered);

  renderTaskList(els.todayTasks, today, "今日のタスクは空です。");
  renderTaskList(els.taskList, filtered, "条件に合うタスクはありません。");
  renderStats();
}

function renderTaskList(container, tasks, emptyText) {
  container.innerHTML = "";
  if (!tasks.length) {
    container.innerHTML = `<p class="empty-state">${emptyText}</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  tasks.forEach((task) => fragment.appendChild(TaskCard(task)));
  container.appendChild(fragment);
}

function TaskCard(task) {
  const node = els.taskTemplate.content.firstElementChild.cloneNode(true);
  const complete = $(".complete-button", node);
  const title = $("h3", node);
  const dot = $(".priority-dot", node);
  const meta = $(".task-meta", node);
  const memo = $(".memo-input", node);

  node.dataset.id = task.id;
  node.classList.toggle("is-completed", task.completed);
  node.classList.add(`priority-${task.priority}`);
  complete.textContent = task.completed ? "✓" : "";
  title.textContent = task.title;
  dot.title = `優先度 ${priorityLabel[task.priority]}`;
  meta.textContent = [
    task.category,
    `優先度 ${priorityLabel[task.priority]}`,
    task.dueDate ? `期限 ${formatDate(task.dueDate)}` : "期限なし"
  ].join(" / ");
  memo.value = task.memo;

  complete.addEventListener("click", () => toggleComplete(task.id));
  $(".delete-button", node).addEventListener("click", () => deleteTask(task.id));
  $(".ask-button", node).addEventListener("click", () => openChatGpt(buildQuestionPrompt(task)));
  memo.addEventListener("input", () => autoSaveMemo(task.id, memo.value));

  return node;
}

function renderTemplates() {
  els.templateQuestions.innerHTML = templateQuestions.map((question) => (
    `<button class="template-button" type="button" data-question="${escapeHtml(question)}">${escapeHtml(question)}</button>`
  )).join("");

  $$(".template-button", els.templateQuestions).forEach((button) => {
    button.addEventListener("click", () => openChatGpt(button.dataset.question));
  });
}

function toggleComplete(id) {
  updateTask(id, (task) => {
    task.completed = !task.completed;
  });
}

function deleteTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task || !confirm(`「${task.title}」を削除しますか？`)) return;
  state.tasks = state.tasks.filter((item) => item.id !== id);
  persist();
  render();
}

function autoSaveMemo(id, memo) {
  clearTimeout(memoSaveTimer);
  memoSaveTimer = setTimeout(() => {
    updateTask(id, (task) => {
      task.memo = memo;
    }, false);
  }, 250);
}

function updateTask(id, updater, shouldRender = true) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== id) return task;
    const next = { ...task };
    updater(next);
    next.updatedAt = new Date().toISOString();
    return next;
  });
  persist();
  if (shouldRender) render();
}

function getVisibleTasks() {
  const query = state.settings.query.trim().toLowerCase();
  const category = state.settings.category;

  return [...state.tasks]
    .filter((task) => category === "all" || task.category === category)
    .filter((task) => !query || `${task.title} ${task.memo} ${task.category}`.toLowerCase().includes(query))
    .sort(sortTasks);
}

function sortTasks(a, b) {
  if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);

  switch (state.settings.sort) {
    case "due-asc":
      return dateValue(a.dueDate) - dateValue(b.dueDate);
    case "priority-desc":
      return priorityRank[b.priority] - priorityRank[a.priority];
    case "title-asc":
      return a.title.localeCompare(b.title, "ja");
    default:
      return new Date(b.createdAt) - new Date(a.createdAt);
  }
}

function getTodayTasks(tasks) {
  const today = new Date().toISOString().slice(0, 10);
  return tasks.filter((task) => task.dueDate === today);
}

function buildQuestionPrompt(task) {
  if (!task) {
    return "司法書士学習・独立準備・知識整理について、悩みを行動タスクに分解してください。";
  }

  return [
    "次のTaskAIタスクについて、実行しやすい行動に分解してください。",
    `タスク: ${task.title}`,
    `カテゴリ: ${task.category}`,
    `優先度: ${priorityLabel[task.priority]}`,
    task.dueDate ? `期限: ${task.dueDate}` : "",
    task.memo ? `メモ: ${task.memo}` : ""
  ].filter(Boolean).join("\n");
}

function openChatGpt(promptText) {
  const url = `https://chatgpt.com/?q=${encodeURIComponent(promptText)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function installPwa() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  els.install.hidden = true;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js");
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    } catch (error) {
      console.warn("Service Worker registration failed", error);
    }
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}

function persist() {
  saveState(state);
}

function optionHtml(category) {
  return `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function dateValue(value) {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short"
  }).format(new Date(`${value}T00:00:00`));
}
