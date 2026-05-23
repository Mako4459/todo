import { createTask, defaultState, loadState, normalizeState, saveState } from "./storage.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const priorityLabel = { high: "高", medium: "中", low: "低" };
const priorityRank = { high: 3, medium: 2, low: 1 };
const templateQuestions = [
  "この悩みを今日やるタスクに分解して",
  "司法書士試験の論点として整理して",
  "独立準備の次の一手を3つ出して",
  "このメモから復習カードを作って",
  "詰まっている理由を質問で掘り下げて"
];

let state = normalizeState(loadState());
let deferredInstallPrompt = null;
let memoSaveTimer = null;
let nextActionTask = null;
let isReloadingForUpdate = false;

const els = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  collectElements();
  renderTemplates();
  bindEvents();
  render();
  registerServiceWorker();
  window.TaskAI = { switchView, exportToObsidian, startVoiceInput };
}

function collectElements() {
  Object.assign(els, {
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
    nextActionText: $("#nextActionText"),
    nextActionAsk: $("#nextActionAskButton"),
    addTaskDetails: $("#addTaskDetails"),
    addTaskFab: $("#addTaskFab"),
    install: $("#installButton"),
    obsidianButton: $("#obsidianButton"),
    voiceButton: $("#voiceButton"),
    editDialog: $("#editTaskDialog"),
    editForm: $("#editTaskForm"),
    editTaskId: $("#editTaskId"),
    editTaskTitle: $("#editTaskTitle"),
    editTaskCategory: $("#editTaskCategory"),
    editCategoryList: $("#editCategoryList"),
    editTaskDueDate: $("#editTaskDueDate"),
    editTaskPriority: $("#editTaskPriority"),
    editTaskMemo: $("#editTaskMemo"),
    closeEditDialog: $("#closeEditDialogButton"),
    cancelEditTask: $("#cancelEditTaskButton"),
    viewButtons: $$(".view-button"),
    calendarView: $("#calendarView"),
    calendarGrid: $("#calendarGrid"),
    calendarTitle: $("#calendarTitle"),
    calendarCount: $("#calendarCount"),
    listSections: $$("[data-list-section]")
  });
}

function bindEvents() {
  els.form?.addEventListener("submit", addTask);
  els.addCategory?.addEventListener("click", addCategory);
  els.search?.addEventListener("input", () => updateSetting("query", els.search.value));
  els.categoryFilter?.addEventListener("change", () => updateSetting("category", els.categoryFilter.value));
  els.sort?.addEventListener("change", () => updateSetting("sort", els.sort.value));
  els.askChatGpt?.addEventListener("click", () => openChatGpt(buildQuestionPrompt()));
  els.nextActionAsk?.addEventListener("click", () => openChatGpt(buildQuestionPrompt(nextActionTask)));
  els.addTaskFab?.addEventListener("click", openAddTaskForm);
  els.install?.addEventListener("click", installPwa);
  els.obsidianButton?.addEventListener("click", exportToObsidian);
  els.voiceButton?.addEventListener("click", startVoiceInput);
  els.editForm?.addEventListener("submit", saveEditedTask);
  els.closeEditDialog?.addEventListener("click", closeEditDialog);
  els.cancelEditTask?.addEventListener("click", closeEditDialog);
  els.viewButtons.forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (els.install) els.install.hidden = false;
  });
}

function addTask(event) {
  event.preventDefault();
  const title = els.title?.value.trim();
  if (!title) return;

  state.tasks.unshift(createTask({
    title,
    category: els.category.value,
    priority: els.priority.value,
    dueDate: els.dueDate.value,
    memo: els.memo.value
  }));

  ensureCategory(els.category.value);
  persist();
  els.form.reset();
  els.priority.value = "medium";
  if (els.addTaskDetails) els.addTaskDetails.open = false;
  render();
}

function addCategory() {
  const category = prompt("追加するカテゴリ名")?.trim();
  if (!category) return;
  ensureCategory(category);
  state.settings.category = category;
  persist();
  render();
  if (els.category) els.category.value = category;
}

function updateSetting(key, value) {
  state.settings[key] = value;
  persist();
  renderTasks();
}

function render() {
  state = normalizeState(state);
  renderCategoryOptions();
  renderStats();
  renderTasks();
  switchView(state.settings.view || "list", false);
}

function renderCategoryOptions() {
  const categoryOptions = state.categories.map(optionHtml).join("");
  if (els.category) els.category.innerHTML = categoryOptions;
  if (els.categoryFilter) {
    els.categoryFilter.innerHTML = `<option value="all">すべてのカテゴリ</option>${categoryOptions}`;
    els.categoryFilter.value = state.categories.includes(state.settings.category) ? state.settings.category : "all";
  }
  if (els.editCategoryList) els.editCategoryList.innerHTML = categoryOptions;
  if (els.search) els.search.value = state.settings.query || "";
  if (els.sort) els.sort.value = state.settings.sort || "created-desc";
  if (els.category && !els.category.value) els.category.value = state.categories[0];
}

function renderStats() {
  const total = state.tasks.length;
  const completed = state.tasks.filter((task) => task.completed).length;
  const today = getTodayTasks(state.tasks);
  const rate = total ? Math.round((completed / total) * 100) : 0;
  $(".progress-ring")?.style.setProperty("--progress", `${rate}%`);
  if (els.completionRate) els.completionRate.textContent = `${rate}%`;
  if (els.todayCount) els.todayCount.textContent = String(today.length);
  if (els.taskCount) els.taskCount.textContent = String(total);
  if (els.todaySummary) {
    els.todaySummary.textContent = today.length
      ? `今日のタスク ${today.length}件。完了 ${today.filter((task) => task.completed).length}件。`
      : "今日のタスクはありません。";
  }
}

function renderTasks() {
  const visible = getVisibleTasks();
  renderNextAction(visible);
  renderTaskList(els.todayTasks, getTodayTasks(visible), "今日のタスクは空です。");
  renderTaskList(els.taskList, visible, "条件に合うタスクはありません。");
  renderStats();
  renderActiveCalendarView();
}

function renderNextAction(tasks) {
  nextActionTask = chooseNextAction(tasks);
  if (!els.nextActionText) return;
  els.nextActionText.textContent = nextActionTask
    ? `${nextActionTask.title} / ${nextActionTask.category} / 優先度${priorityLabel[nextActionTask.priority]}${nextActionTask.dueDate ? ` / 期限 ${formatDate(nextActionTask.dueDate)}` : ""}`
    : "未完了タスクを追加すると、ここに次の一手が表示されます。";
}

function chooseNextAction(tasks) {
  return tasks
    .filter((task) => !task.completed)
    .sort((a, b) => dateValue(a.dueDate) - dateValue(b.dueDate) || priorityRank[b.priority] - priorityRank[a.priority])[0] || null;
}

function renderTaskList(container, tasks, emptyText) {
  if (!container) return;
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
  node.classList.toggle("is-completed", task.completed);
  node.classList.add(`priority-${task.priority}`);
  $(".complete-button", node).textContent = task.completed ? "✓" : "";
  $("h3", node).textContent = task.title;
  $(".priority-dot", node).title = `優先度 ${priorityLabel[task.priority]}`;
  $(".task-meta", node).textContent = [task.category, `優先度 ${priorityLabel[task.priority]}`, task.dueDate ? `期限 ${formatDate(task.dueDate)}` : "期限なし"].join(" / ");
  const memo = $(".memo-input", node);
  memo.value = task.memo || "";
  $(".complete-button", node).addEventListener("click", () => toggleComplete(task.id));
  $(".edit-button", node).addEventListener("click", () => openEditDialog(task.id));
  $(".ask-button", node).addEventListener("click", () => openChatGpt(buildQuestionPrompt(task)));
  $(".delete-button", node).addEventListener("click", () => deleteTask(task.id));
  memo.addEventListener("input", () => autoSaveMemo(task.id, memo.value));
  return node;
}

function renderTemplates() {
  if (!els.templateQuestions) return;
  els.templateQuestions.innerHTML = templateQuestions
    .map((question) => `<button class="template-button" type="button" data-question="${escapeHtml(question)}">${escapeHtml(question)}</button>`)
    .join("");
  $$(".template-button", els.templateQuestions).forEach((button) => {
    button.addEventListener("click", () => openChatGpt(button.dataset.question));
  });
}

function toggleComplete(id) {
  updateTask(id, (task) => { task.completed = !task.completed; });
}

function openEditDialog(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  els.editTaskId.value = task.id;
  els.editTaskTitle.value = task.title;
  els.editTaskCategory.value = task.category;
  els.editTaskDueDate.value = task.dueDate || "";
  els.editTaskPriority.value = task.priority;
  els.editTaskMemo.value = task.memo || "";
  renderCategoryOptions();
  if (els.editDialog?.showModal) els.editDialog.showModal();
  else editTaskByPrompt(task);
}

function saveEditedTask(event) {
  event.preventDefault();
  const id = els.editTaskId.value;
  const category = els.editTaskCategory.value.trim() || defaultState.categories[0];
  ensureCategory(category);
  updateTask(id, (task) => {
    task.title = els.editTaskTitle.value.trim();
    task.category = category;
    task.dueDate = els.editTaskDueDate.value;
    task.priority = els.editTaskPriority.value;
    task.memo = els.editTaskMemo.value;
  });
  closeEditDialog();
}

function editTaskByPrompt(task) {
  const title = prompt("タスク名を編集", task.title)?.trim();
  if (!title) return;
  updateTask(task.id, (next) => { next.title = title; });
}

function closeEditDialog() {
  if (els.editDialog?.open) els.editDialog.close();
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
  memoSaveTimer = setTimeout(() => updateTask(id, (task) => { task.memo = memo; }, false), 250);
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
  const query = (state.settings.query || "").trim().toLowerCase();
  const category = state.settings.category || "all";
  return [...state.tasks]
    .filter((task) => category === "all" || task.category === category)
    .filter((task) => !query || `${task.title} ${task.memo} ${task.category}`.toLowerCase().includes(query))
    .sort(sortTasks);
}

function sortTasks(a, b) {
  if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
  if (state.settings.sort === "due-asc") return dateValue(a.dueDate) - dateValue(b.dueDate);
  if (state.settings.sort === "priority-desc") return priorityRank[b.priority] - priorityRank[a.priority];
  if (state.settings.sort === "title-asc") return a.title.localeCompare(b.title, "ja");
  return new Date(b.createdAt) - new Date(a.createdAt);
}

function switchView(view, save = true) {
  const nextView = ["list", "week", "month"].includes(view) ? view : "list";
  state.settings.view = nextView;
  if (save) persist();
  els.viewButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === nextView));
  els.calendarView?.classList.toggle("hidden", nextView === "list");
  els.listSections.forEach((section) => section.classList.toggle("hidden", nextView !== "list"));
  renderActiveCalendarView();
}

function renderActiveCalendarView() {
  if (!els.calendarView || els.calendarView.classList.contains("hidden")) return;
  if (state.settings.view === "month") renderMonthView();
  else renderWeekView();
}

function renderWeekView() {
  const start = getStartOfWeek(new Date());
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  if (els.calendarTitle) els.calendarTitle.textContent = "週間ビュー";
  renderCalendarDays(days, true);
}

function renderMonthView() {
  const today = new Date();
  const days = Array.from({ length: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() }, (_, index) => new Date(today.getFullYear(), today.getMonth(), index + 1));
  if (els.calendarTitle) els.calendarTitle.textContent = `${today.getFullYear()}年${today.getMonth() + 1}月`;
  renderCalendarDays(days, false);
}

function renderCalendarDays(days, showWeekday) {
  if (!els.calendarGrid) return;
  const visibleTasks = getVisibleTasks();
  const todayKey = toDateKey(new Date());
  let count = 0;
  els.calendarGrid.innerHTML = "";
  days.forEach((date) => {
    const dateKey = toDateKey(date);
    const dayTasks = visibleTasks.filter((task) => task.dueDate === dateKey);
    count += dayTasks.length;
    const day = document.createElement("div");
    day.className = `calendar-day${dateKey === todayKey ? " today" : ""}`;
    const heading = document.createElement("h3");
    heading.textContent = showWeekday
      ? `${date.getMonth() + 1}/${date.getDate()} ${new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date)}`
      : String(date.getDate());
    day.appendChild(heading);
    if (!dayTasks.length) {
      const empty = document.createElement("p");
      empty.textContent = "予定なし";
      day.appendChild(empty);
    }
    dayTasks.forEach((task) => {
      const item = document.createElement("button");
      item.className = `calendar-task ${task.priority}`;
      item.type = "button";
      item.textContent = task.title;
      item.addEventListener("click", () => openEditDialog(task.id));
      day.appendChild(item);
    });
    els.calendarGrid.appendChild(day);
  });
  if (els.calendarCount) els.calendarCount.textContent = String(count);
}

function exportToObsidian() {
  const today = toDateKey(new Date());
  const lines = [
    `# TaskAI ${today}`,
    "",
    "## 未完了",
    ...state.tasks.filter((task) => !task.completed).map(markdownTask),
    "",
    "## 完了",
    ...state.tasks.filter((task) => task.completed).map(markdownTask),
    ""
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `taskai-${today}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function markdownTask(task) {
  const checked = task.completed ? "x" : " ";
  const due = task.dueDate ? ` 📅 ${task.dueDate}` : "";
  const memo = task.memo ? `\n  - ${task.memo.replaceAll("\n", "\n  - ")}` : "";
  return `- [${checked}] ${task.title} #${task.category} 優先度:${priorityLabel[task.priority]}${due}${memo}`;
}

function startVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("このブラウザでは音声入力を利用できません。ChromeやEdgeで試してください。");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.interimResults = false;
  recognition.onstart = () => setVoiceButtonState(true);
  recognition.onend = () => setVoiceButtonState(false);
  recognition.onerror = () => setVoiceButtonState(false);
  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim();
    if (!transcript) return;
    openAddTaskForm();
    els.title.value = els.title.value ? `${els.title.value} ${transcript}` : transcript;
    els.title.focus();
  };
  recognition.start();
}

function setVoiceButtonState(active) {
  if (!els.voiceButton) return;
  els.voiceButton.disabled = active;
  els.voiceButton.textContent = active ? "聞き取り中..." : "音声入力";
}

function buildQuestionPrompt(task) {
  if (!task) return "司法書士学習・独立準備・知識整理について、悩みを行動タスクに分解してください。";
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
  window.open(`https://chatgpt.com/?q=${encodeURIComponent(promptText)}`, "_blank", "noopener,noreferrer");
}

function openAddTaskForm() {
  if (els.addTaskDetails) els.addTaskDetails.open = true;
  els.title?.focus();
}

async function installPwa() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  if (els.install) els.install.hidden = true;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js?v=20260524");
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) worker.postMessage({ type: "SKIP_WAITING" });
        });
      });
      await registration.update();
    } catch (error) {
      console.warn("TaskAI: Service Worker登録に失敗しました", error);
    }
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (isReloadingForUpdate) return;
    isReloadingForUpdate = true;
    window.location.reload();
  });
}

function persist() {
  saveState(state);
}

function ensureCategory(category) {
  const normalized = String(category || "").trim();
  if (normalized && !state.categories.includes(normalized)) state.categories.push(normalized);
}

function getTodayTasks(tasks) {
  const today = toDateKey(new Date());
  return tasks.filter((task) => task.dueDate === today);
}

function getStartOfWeek(date) {
  const copied = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copied.setDate(copied.getDate() + (copied.getDay() === 0 ? -6 : 1 - copied.getDay()));
  return copied;
}

function addDays(date, days) {
  const copied = new Date(date);
  copied.setDate(copied.getDate() + days);
  return copied;
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function optionHtml(category) {
  return `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function dateValue(value) {
  return value ? new Date(`${value}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short" }).format(new Date(`${value}T00:00:00`));
}
