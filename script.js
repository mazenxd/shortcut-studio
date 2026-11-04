const shortcuts = [
  { id: "command-palette", name: "Show Command Palette", category: "General", windows: ["Ctrl", "Shift", "P"], mac: ["⌘", "Shift", "P"] },
  { id: "quick-open", name: "Quick Open a File", category: "Navigation", windows: ["Ctrl", "P"], mac: ["⌘", "P"] },
  { id: "settings", name: "Open Settings", category: "General", windows: ["Ctrl", ","], mac: ["⌘", ","] },
  { id: "toggle-terminal", name: "Toggle Integrated Terminal", category: "Terminal", windows: ["Ctrl", "`"], mac: ["⌃", "`"] },
  { id: "find", name: "Find in Current File", category: "Editing", windows: ["Ctrl", "F"], mac: ["⌘", "F"] },
  { id: "replace", name: "Replace in Current File", category: "Editing", windows: ["Ctrl", "H"], mac: ["⌥", "⌘", "F"] },
  { id: "find-files", name: "Find in All Files", category: "Search", windows: ["Ctrl", "Shift", "F"], mac: ["⌘", "Shift", "F"] },
  { id: "save", name: "Save File", category: "General", windows: ["Ctrl", "S"], mac: ["⌘", "S"] },
  { id: "format", name: "Format Document", category: "Editing", windows: ["Shift", "Alt", "F"], mac: ["Shift", "Option", "F"] },
  { id: "comment", name: "Toggle Line Comment", category: "Editing", windows: ["Ctrl", "/"], mac: ["⌘", "/"] },
  { id: "duplicate-line", name: "Move Line Up / Down", category: "Editing", windows: ["Alt", "↑ / ↓"], mac: ["Option", "↑ / ↓"] },
  { id: "multi-cursor", name: "Add Cursor Above / Below", category: "Editing", windows: ["Ctrl", "Alt", "↑ / ↓"], mac: ["⌥", "⌘", "↑ / ↓"] },
  { id: "go-to-line", name: "Go to Line", category: "Navigation", windows: ["Ctrl", "G"], mac: ["⌃", "G"] },
  { id: "go-to-definition", name: "Go to Definition", category: "Navigation", windows: ["F12"], mac: ["F12"] },
  { id: "switch-tab", name: "Switch Editor Tab", category: "Navigation", windows: ["Ctrl", "Tab"], mac: ["⌃", "Tab"] },
  { id: "new-file", name: "Create New File", category: "Files", windows: ["Ctrl", "N"], mac: ["⌘", "N"] },
  { id: "close-editor", name: "Close Current Editor", category: "Files", windows: ["Ctrl", "W"], mac: ["⌘", "W"] },
  { id: "explorer", name: "Show Explorer", category: "Navigation", windows: ["Ctrl", "Shift", "E"], mac: ["⌘", "Shift", "E"] },
  { id: "source-control", name: "Show Source Control", category: "Navigation", windows: ["Ctrl", "Shift", "G"], mac: ["⌃", "Shift", "G"] },
  { id: "extensions", name: "Show Extensions", category: "Navigation", windows: ["Ctrl", "Shift", "X"], mac: ["⌘", "Shift", "X"] },
  { id: "zen-mode", name: "Toggle Zen Mode", category: "View", windows: ["Ctrl", "K", "Z"], mac: ["⌘", "K", "Z"] },
  { id: "rename", name: "Rename Symbol", category: "Editing", windows: ["F2"], mac: ["F2"] },
  { id: "quick-fix", name: "Show Quick Fixes", category: "Editing", windows: ["Ctrl", "."], mac: ["⌘", "."] },
  { id: "split-editor", name: "Split Editor", category: "View", windows: ["Ctrl", "\\"], mac: ["⌘", "\\"] }
];

const categories = ["All", ...new Set(shortcuts.map((shortcut) => shortcut.category))];
const categoryContainer = document.querySelector("#categories");
const shortcutGrid = document.querySelector("#shortcut-grid");
const searchInput = document.querySelector("#search");
const platformSelect = document.querySelector("#platform");
const favoriteToggle = document.querySelector("#favorites-toggle");
const favoriteCount = document.querySelector("#favorite-count");
const resultsCount = document.querySelector("#results-count");
const emptyState = document.querySelector("#empty-state");
const toast = document.querySelector("#toast");
const storageKey = "shortcut-studio-favorites";
let activeCategory = "All";
let favoritesOnly = false;
let toastTimer;

function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(saved) || !saved.every((id) => typeof id === "string")) {
      throw new Error("Saved favorites must be a list of shortcut IDs.");
    }
    return new Set(saved);
  } catch (error) {
    console.error("Could not load saved favorites.", error);
    return new Set();
  }
}

const favoriteIds = loadFavorites();

function saveFavorites() {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...favoriteIds]));
    return true;
  } catch (error) {
    console.error("Could not save favorites.", error);
    showToast("Favorites could not be saved in this browser.");
    return false;
  }
}

function renderCategories() {
  categoryContainer.innerHTML = categories.map((category) => `
    <button class="category-button${category === activeCategory ? " selected" : ""}"
      type="button" data-category="${category}" aria-pressed="${category === activeCategory}">${category}</button>
  `).join("");
}

function getVisibleShortcuts() {
  const query = searchInput.value.trim().toLowerCase();
  return shortcuts.filter((shortcut) => {
    const matchesCategory = activeCategory === "All" || shortcut.category === activeCategory;
    const matchesFavorite = !favoritesOnly || favoriteIds.has(shortcut.id);
    const keys = shortcut[platformSelect.value].join(" ").toLowerCase();
    const matchesQuery = !query || `${shortcut.name} ${shortcut.category} ${keys}`.toLowerCase().includes(query);
    return matchesCategory && matchesFavorite && matchesQuery;
  });
}

function renderShortcuts() {
  const visible = getVisibleShortcuts();
  resultsCount.textContent = `${visible.length} ${visible.length === 1 ? "shortcut" : "shortcuts"}`;
  favoriteCount.textContent = favoriteIds.size;
  favoriteToggle.setAttribute("aria-pressed", String(favoritesOnly));
  shortcutGrid.innerHTML = visible.map((shortcut) => {
    const keys = shortcut[platformSelect.value].map((key) => key.split(" / ").map((part) =>
      `<span class="keycap">${escapeHtml(part)}</span>`).join('<span class="key-plus">/</span>')).join('<span class="key-plus">+</span>');
    const isFavorite = favoriteIds.has(shortcut.id);
    return `
      <article class="shortcut-card">
        <div class="card-top">
          <span class="card-category">${shortcut.category}</span>
          <button class="favorite-button${isFavorite ? " is-favorite" : ""}" type="button"
            data-favorite="${shortcut.id}" aria-label="${isFavorite ? "Remove" : "Add"} ${escapeHtml(shortcut.name)} ${isFavorite ? "from" : "to"} favorites"
            aria-pressed="${isFavorite}">${isFavorite ? "♥" : "♡"}</button>
        </div>
        <div class="card-name">${escapeHtml(shortcut.name)}</div>
        <div class="card-bottom">
          <div class="keys" aria-label="${escapeHtml(shortcut[platformSelect.value].join(" + "))}">${keys}</div>
          <button class="copy-button" type="button" data-copy="${shortcut.id}" aria-label="Copy shortcut for ${escapeHtml(shortcut.name)}"><span class="copy-icon" aria-hidden="true">▢</span> Copy</button>
        </div>
      </article>
    `;
  }).join("");
  emptyState.hidden = visible.length > 0;
  shortcutGrid.hidden = visible.length === 0;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
}

categoryContainer.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  renderCategories();
  renderShortcuts();
});

shortcutGrid.addEventListener("click", async (event) => {
  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) {
    const id = favoriteButton.dataset.favorite;
    const wasFavorite = favoriteIds.has(id);
    if (favoriteIds.has(id)) favoriteIds.delete(id);
    else favoriteIds.add(id);
    if (!saveFavorites()) {
      if (wasFavorite) favoriteIds.add(id);
      else favoriteIds.delete(id);
    }
    renderShortcuts();
    return;
  }

  const copyButton = event.target.closest("[data-copy]");
  if (!copyButton) return;
  const shortcut = shortcuts.find((item) => item.id === copyButton.dataset.copy);
  if (!shortcut) return;
  const keys = shortcut[platformSelect.value].join(" + ");
  try {
    await navigator.clipboard.writeText(keys);
    showToast(`Copied ${keys}`);
  } catch (error) {
    console.error("Could not copy shortcut to clipboard.", error);
    showToast("Clipboard access unavailable. Select the keys to copy manually.");
  }
});

categoryContainer.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    const button = event.target.closest("[data-category]");
    if (button) button.click();
  }
});

searchInput.addEventListener("input", renderShortcuts);
platformSelect.addEventListener("change", renderShortcuts);
favoriteToggle.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  renderShortcuts();
});
document.querySelector("#reset-filters").addEventListener("click", () => {
  activeCategory = "All";
  favoritesOnly = false;
  searchInput.value = "";
  renderCategories();
  renderShortcuts();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape" && document.activeElement === searchInput) {
    searchInput.value = "";
    renderShortcuts();
    searchInput.blur();
  }
});

renderCategories();
renderShortcuts();
