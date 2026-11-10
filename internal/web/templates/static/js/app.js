// templates/app.js

const API_ROOT = window.API_ROOT;
const WEB_SETTINGS_KEY = "musicdl:web_settings";
const INSPECT_REQUEST_DELAY_MS = 20;
const INSPECT_MAX_CONCURRENCY = 3;
const INSPECT_SOURCE_MAX_CONCURRENCY = 3;
const INSPECT_SOURCE_MIN_CONCURRENCY = 1;
const INSPECT_RETRY_BASE_DELAY_MS = 1200;
const INSPECT_RETRY_MAX_DELAY_MS = 30000;
const INSPECT_MAX_RETRIES = 2;
const AUTO_SWITCH_INVALID_DELAY_MS = 500;
const DEFAULT_WEB_PAGE_SIZE = 50;
const DEFAULT_CLI_PAGE_SIZE = 20;
const DOWNLOAD_DIR_CUSTOM_VALUE = "__custom__";
const DOWNLOAD_DIR_PRESET_VALUES = [
  "data/downloads",
  "downloads",
  "D:/Music/Downloads",
  "/app/data",
];
const DOWNLOAD_DIR_PRESETS = new Set(DOWNLOAD_DIR_PRESET_VALUES);
const DEFAULT_DOWNLOAD_TIP_DURATION = 8;
const OPEN_CONFIG_QUERY = "open_config";

let webSettings = {
  embedDownload: true,
  downloadLyricsToLocal: false,
  downloadToLocal: true,
  downloadDir: "data/downloads",
  downloadFilenameTemplate: "{name} - {artist}",
  downloadTipDuration: DEFAULT_DOWNLOAD_TIP_DURATION,
  webdavEnabled: false,
  webdavUrl: "",
  webdavUsername: "",
  webdavPassword: "",
  webdavDir: "music-dl",
  webPageSize: DEFAULT_WEB_PAGE_SIZE,
  cliPageSize: DEFAULT_CLI_PAGE_SIZE,
  autoSwitchInvalidSources: false,
  filterVersionKeywords: false,
  versionFilterKeywords: "Live, Remix, Demo",
  filterShortTracks: false,
  normalizeChineseVariants: true,
  sodaSignerUrl: "",
  sodaSignerToken: "",
  sodaClientDir: "",
  sodaLocalSignerAvailable: false,
};

function normalizeWebSettings(raw) {
  const next = {
    embedDownload: true,
    downloadLyricsToLocal: false,
    downloadToLocal: true,
    downloadDir: "data/downloads",
    downloadFilenameTemplate: "{name} - {artist}",
    downloadTipDuration: DEFAULT_DOWNLOAD_TIP_DURATION,
    webdavEnabled: false,
    webdavUrl: "",
    webdavUsername: "",
    webdavPassword: "",
    webdavDir: "music-dl",
    webPageSize: DEFAULT_WEB_PAGE_SIZE,
    cliPageSize: DEFAULT_CLI_PAGE_SIZE,
    autoSwitchInvalidSources: false,
    filterVersionKeywords: false,
    versionFilterKeywords: "Live, Remix, Demo",
    filterShortTracks: false,
    normalizeChineseVariants: true,
    sodaSignerUrl: "",
    sodaSignerToken: "",
    sodaClientDir: "",
    sodaLocalSignerAvailable: false,
  };

  if (!raw || typeof raw !== "object") {
    return next;
  }

  if (typeof raw.embedDownload === "boolean") {
    next.embedDownload = raw.embedDownload;
  }
  if (typeof raw.downloadLyricsToLocal === "boolean") {
    next.downloadLyricsToLocal = raw.downloadLyricsToLocal;
  }
  if (typeof raw.downloadDir === "string" && raw.downloadDir.trim() !== "") {
    next.downloadDir = raw.downloadDir.trim();
  }
  if (
    typeof raw.downloadFilenameTemplate === "string" &&
    raw.downloadFilenameTemplate.trim() !== ""
  ) {
    next.downloadFilenameTemplate = raw.downloadFilenameTemplate.trim();
  }
  if (
    Number.isInteger(raw.downloadTipDuration) &&
    raw.downloadTipDuration > 0
  ) {
    next.downloadTipDuration = Math.min(raw.downloadTipDuration, 60);
  }
  if (typeof raw.webdavEnabled === "boolean") {
    next.webdavEnabled = raw.webdavEnabled;
  }
  if (typeof raw.webdavUrl === "string" && raw.webdavUrl.trim() !== "") {
    next.webdavUrl = raw.webdavUrl.trim();
  }
  if (
    typeof raw.webdavUsername === "string" &&
    raw.webdavUsername.trim() !== ""
  ) {
    next.webdavUsername = raw.webdavUsername.trim();
  }
  if (typeof raw.webdavPassword === "string") {
    next.webdavPassword = raw.webdavPassword;
  }
  if (typeof raw.webdavDir === "string" && raw.webdavDir.trim() !== "") {
    next.webdavDir = raw.webdavDir.trim().replace(/^\/+|\/+$/g, "");
  }
  if (Number.isInteger(raw.webPageSize) && raw.webPageSize > 0) {
    next.webPageSize = Math.min(raw.webPageSize, 500);
  }
  if (Number.isInteger(raw.cliPageSize) && raw.cliPageSize > 0) {
    next.cliPageSize = Math.min(raw.cliPageSize, 200);
  }
  if (typeof raw.autoSwitchInvalidSources === "boolean") {
    next.autoSwitchInvalidSources = raw.autoSwitchInvalidSources;
  }
  if (typeof raw.filterVersionKeywords === "boolean") {
    next.filterVersionKeywords = raw.filterVersionKeywords;
  }
  if (typeof raw.versionFilterKeywords === "string") {
    next.versionFilterKeywords =
      raw.versionFilterKeywords.trim() || "Live, Remix, Demo";
  }
  if (typeof raw.filterShortTracks === "boolean") {
    next.filterShortTracks = raw.filterShortTracks;
  }
  if (typeof raw.normalizeChineseVariants === "boolean") {
    next.normalizeChineseVariants = raw.normalizeChineseVariants;
  }
  if (typeof raw.sodaSignerUrl === "string") {
    next.sodaSignerUrl = raw.sodaSignerUrl.trim();
  }
  if (typeof raw.sodaSignerToken === "string") {
    next.sodaSignerToken = raw.sodaSignerToken;
  }
  if (typeof raw.sodaClientDir === "string") {
    next.sodaClientDir = raw.sodaClientDir.trim();
  }
  if (typeof raw.sodaLocalSignerAvailable === "boolean") {
    next.sodaLocalSignerAvailable = raw.sodaLocalSignerAvailable;
  }
  return next;
}

function loadWebSettingsFromCache() {
  try {
    const raw = localStorage.getItem(WEB_SETTINGS_KEY);
    if (!raw) return webSettings;
    webSettings = normalizeWebSettings(JSON.parse(raw));
  } catch (_) {}
  return webSettings;
}

function persistWebSettingsCache() {
  try {
    localStorage.setItem(WEB_SETTINGS_KEY, JSON.stringify(webSettings));
  } catch (_) {}
}

let activeSettingsTab = "general";

function setSettingsTab(tabName) {
  const tabs = Array.from(document.querySelectorAll("[data-settings-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-settings-panel]"));
  if (!tabs.length || !panels.length) return;

  const requested = String(tabName || "").trim();
  const target = panels.some((panel) => panel.dataset.settingsPanel === requested)
    ? requested
    : "general";
  activeSettingsTab = target;

  tabs.forEach((tab) => {
    const active = tab.dataset.settingsTab === target;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  panels.forEach((panel) => {
    panel.hidden = panel.dataset.settingsPanel !== target;
  });
}

function bindSettingsTabs() {
  const tabs = Array.from(document.querySelectorAll("[data-settings-tab]"));
  if (!tabs.length) return;

  tabs.forEach((tab, index) => {
    if (tab.dataset.bound === "1") return;
    tab.dataset.bound = "1";
    tab.addEventListener("click", () => setSettingsTab(tab.dataset.settingsTab));
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const next = tabs[(index + offset + tabs.length) % tabs.length];
      next.focus();
      setSettingsTab(next.dataset.settingsTab);
    });
  });
  setSettingsTab(activeSettingsTab);
}

function syncWebDAVVisibility() {
  const fields = document.getElementById("webdav-settings-fields");
  if (fields) {
    fields.style.display = webSettings.webdavEnabled ? "block" : "none";
  }
}

function syncSearchFilterControls() {
  const versionToggle = document.getElementById(
    "setting-filter-version-keywords",
  );
  const keywordInput = document.getElementById(
    "setting-version-filter-keywords",
  );
  if (keywordInput) {
    keywordInput.disabled = !versionToggle?.checked;
  }
}

function bindSearchFilterSettingEvents() {
  const versionToggle = document.getElementById(
    "setting-filter-version-keywords",
  );
  if (versionToggle && versionToggle.dataset.bound !== "1") {
    versionToggle.dataset.bound = "1";
    versionToggle.addEventListener("change", syncSearchFilterControls);
  }
  syncSearchFilterControls();
}

function bindWebDAVSettingEvents() {
  const toggle = document.getElementById("setting-webdav-enabled");
  if (!toggle || toggle.dataset.bound === "1") return;
  toggle.dataset.bound = "1";
  toggle.addEventListener("change", () => {
    const fields = document.getElementById("webdav-settings-fields");
    if (fields) fields.style.display = toggle.checked ? "block" : "none";
  });
}

function syncDownloadDirPresetFromInput() {
  const presetSelect = document.getElementById("setting-download-dir-preset");
  const dirInput = document.getElementById("setting-download-dir");
  if (!presetSelect || !dirInput) return;

  const value = String(dirInput.value || "").trim();
  const normalizedValue = value.replace(/\\/g, "/");
  presetSelect.value = DOWNLOAD_DIR_PRESETS.has(normalizedValue)
    ? normalizedValue
    : DOWNLOAD_DIR_CUSTOM_VALUE;
}

function bindDownloadDirPresetEvents() {
  const presetSelect = document.getElementById("setting-download-dir-preset");
  const dirInput = document.getElementById("setting-download-dir");
  if (!presetSelect || !dirInput || presetSelect.dataset.bound === "1") return;

  presetSelect.dataset.bound = "1";
  presetSelect.addEventListener("change", () => {
    if (presetSelect.value === DOWNLOAD_DIR_CUSTOM_VALUE) {
      dirInput.focus();
      return;
    }
    dirInput.value = presetSelect.value;
  });
  dirInput.addEventListener("input", syncDownloadDirPresetFromInput);
}

function applyWebSettings(settings) {
  const wasAutoSwitchInvalidSourcesEnabled =
    isAutoSwitchInvalidSourcesEnabled();
  webSettings = normalizeWebSettings(settings);
  persistWebSettingsCache();

  const embedToggle = document.getElementById("setting-embed-download");
  if (embedToggle) {
    embedToggle.checked = webSettings.embedDownload;
  }
  const downloadLyricsToggle = document.getElementById(
    "setting-download-lyrics-to-local",
  );
  if (downloadLyricsToggle) {
    downloadLyricsToggle.checked = webSettings.downloadLyricsToLocal;
  }

  const webdavEnabledToggle = document.getElementById(
    "setting-webdav-enabled",
  );
  if (webdavEnabledToggle) {
    webdavEnabledToggle.checked = webSettings.webdavEnabled;
  }
  const webdavUrlInput = document.getElementById("setting-webdav-url");
  if (webdavUrlInput) {
    webdavUrlInput.value = webSettings.webdavUrl;
  }
  const webdavUsernameInput = document.getElementById(
    "setting-webdav-username",
  );
  if (webdavUsernameInput) {
    webdavUsernameInput.value = webSettings.webdavUsername;
  }
  const webdavPasswordInput = document.getElementById(
    "setting-webdav-password",
  );
  if (webdavPasswordInput) {
    webdavPasswordInput.value = webSettings.webdavPassword;
  }
  const webdavDirInput = document.getElementById("setting-webdav-dir");
  if (webdavDirInput) {
    webdavDirInput.value = webSettings.webdavDir;
  }
  const sodaSignerUrlInput = document.getElementById("setting-soda-signer-url");
  if (sodaSignerUrlInput) {
    sodaSignerUrlInput.value = webSettings.sodaSignerUrl;
  }
  const sodaSignerTokenInput = document.getElementById(
    "setting-soda-signer-token",
  );
  if (sodaSignerTokenInput) {
    sodaSignerTokenInput.value = "";
  }
  const sodaClientDirInput = document.getElementById("setting-soda-client-dir");
  if (sodaClientDirInput) {
    sodaClientDirInput.value = webSettings.sodaClientDir;
  }
  const sodaLocalSignerState = document.getElementById(
    "setting-soda-local-signer-state",
  );
  if (sodaLocalSignerState) {
    sodaLocalSignerState.textContent = webSettings.sodaLocalSignerAvailable
      ? "已检测到本机签名器：留空地址即可用。"
      : "未检测到本机签名器：请安装汽水官方客户端（或 Node.js），或填写下面的远程签名服务地址。";
  }
  bindWebDAVSettingEvents();
  syncWebDAVVisibility();

  const dirInput = document.getElementById("setting-download-dir");
  if (dirInput) {
    dirInput.value = webSettings.downloadDir;
  }
  bindDownloadDirPresetEvents();
  syncDownloadDirPresetFromInput();

  const filenameTemplateInput = document.getElementById(
    "setting-download-filename-template",
  );
  if (filenameTemplateInput) {
    filenameTemplateInput.value = webSettings.downloadFilenameTemplate;
  }

  const downloadTipDurationInput = document.getElementById(
    "setting-download-tip-duration",
  );
  if (downloadTipDurationInput) {
    downloadTipDurationInput.value = String(webSettings.downloadTipDuration);
  }

  const webPageSizeInput = document.getElementById("setting-web-page-size");
  if (webPageSizeInput) {
    webPageSizeInput.value = String(
      webSettings.webPageSize || DEFAULT_WEB_PAGE_SIZE,
    );
  }

  const cliPageSizeInput = document.getElementById("setting-cli-page-size");
  if (cliPageSizeInput) {
    cliPageSizeInput.value = String(
      webSettings.cliPageSize || DEFAULT_CLI_PAGE_SIZE,
    );
  }

  const autoSwitchInvalidSourcesToggle = document.getElementById(
    "setting-auto-switch-invalid-sources",
  );
  if (autoSwitchInvalidSourcesToggle) {
    autoSwitchInvalidSourcesToggle.checked =
      webSettings.autoSwitchInvalidSources;
  }

  const filterVersionToggle = document.getElementById(
    "setting-filter-version-keywords",
  );
  if (filterVersionToggle) {
    filterVersionToggle.checked = webSettings.filterVersionKeywords;
  }
  const versionFilterKeywordsInput = document.getElementById(
    "setting-version-filter-keywords",
  );
  if (versionFilterKeywordsInput) {
    versionFilterKeywordsInput.value = webSettings.versionFilterKeywords;
  }
  const filterShortTracksToggle = document.getElementById(
    "setting-filter-short-tracks",
  );
  if (filterShortTracksToggle) {
    filterShortTracksToggle.checked = webSettings.filterShortTracks;
  }
  const normalizeChineseVariantsToggle = document.getElementById(
    "setting-normalize-chinese-variants",
  );
  if (normalizeChineseVariantsToggle) {
    normalizeChineseVariantsToggle.checked =
      webSettings.normalizeChineseVariants;
  }
  bindSearchFilterSettingEvents();

  refreshDownloadLinks();
  if (webSettings.autoSwitchInvalidSources) {
    if (!wasAutoSwitchInvalidSourcesEnabled) {
      autoSwitchInvalidLastKey = "";
    }
    scheduleAutoSwitchInvalidSources(0);
  } else {
    clearAutoSwitchInvalidTimer();
  }
}

async function fetchWebSettings() {
  try {
    const response = await fetch(API_ROOT + "/settings");
    if (!response.ok) return;
    const data = await response.json();
    applyWebSettings(data);
  } catch (_) {}
}

function systemConfigReturnURL() {
  const url = new URL(window.location.href);
  url.searchParams.set(OPEN_CONFIG_QUERY, "1");
  return url.pathname + url.search + url.hash;
}

function redirectToConfigAuth(setupRequired = false) {
  const next = encodeURIComponent(systemConfigReturnURL());
  window.location.href = `${API_ROOT}/${setupRequired ? "setup" : "login"}?next=${next}`;
}

function handleConfigAuthResponse(response, payload = null) {
  if (response.status !== 401) return false;
  redirectToConfigAuth(!!(payload && payload.setupRequired));
  return true;
}

function setAuthFloatLoggedIn(loggedIn) {
  const form = document.getElementById("auth-float-form");
  const icon = document.getElementById("auth-float-icon");
  if (!form || !icon) return;
  form.dataset.loggedIn = loggedIn ? "1" : "0";
  form.title = loggedIn ? "退出登录" : "登录";
  form.classList.toggle("auth-login", !loggedIn);
  form.classList.toggle("auth-logout", loggedIn);
  icon.className = loggedIn
    ? "fa-solid fa-arrow-right-from-bracket"
    : "fa-solid fa-right-to-bracket";
}

async function refreshAuthFloat() {
  try {
    const response = await fetch(API_ROOT + "/cookies", {
      method: "HEAD",
      headers: { Accept: "application/json" },
    });
    setAuthFloatLoggedIn(response.ok);
  } catch (_) {
    setAuthFloatLoggedIn(false);
  }
}

function bindAuthFloat() {
  const form = document.getElementById("auth-float-form");
  if (!form || form.dataset.bound === "1") return;
  form.dataset.bound = "1";
  form.addEventListener("submit", function (event) {
    if (form.dataset.loggedIn === "1") return;
    event.preventDefault();
    openSystemConfig("cookies");
  });
}

function buildDownloadRequestURL(
  id,
  source,
  name,
  artist,
  album,
  cover,
  extra,
  options = {},
) {
  const params = new URLSearchParams({
    id: String(id || ""),
    source: String(source || ""),
    name: String(name || ""),
    artist: String(artist || ""),
  });

  const albumValue = String(album || "");
  if (albumValue !== "") {
    params.set("album", albumValue);
  }
  const coverValue = String(cover || "");
  if (coverValue !== "") {
    params.set("cover", coverValue);
  }
  const extraValue = String(extra || "");
  if (extraValue !== "" && extraValue !== "{}" && extraValue !== "null") {
    params.set("extra", extraValue);
  }
  if (options.embed) {
    params.set("embed", "1");
  }
  if (options.saveLocal) {
    params.set("save_local", "1");
  }

  return `${API_ROOT}/download?${params.toString()}`;
}

function buildDownloadURL(id, source, name, artist, album, cover, extra) {
  return buildDownloadRequestURL(
    id,
    source,
    name,
    artist,
    album,
    cover,
    extra,
    {
      embed: webSettings.embedDownload,
      saveLocal: true,
    },
  );
}

function buildBrowserDownloadURL(
  id,
  source,
  name,
  artist,
  album,
  cover,
  extra,
) {
  return buildDownloadRequestURL(
    id,
    source,
    name,
    artist,
    album,
    cover,
    extra,
    {
      embed: webSettings.embedDownload,
    },
  );
}

function buildLyricRequestURL(song, endpoint = "lyric", format = "auto") {
  const params = new URLSearchParams({
    id: String(song?.id || ""),
    source: String(song?.source || ""),
    name: String(song?.name || ""),
    artist: String(song?.artist || ""),
    album: String(song?.album || ""),
    duration: String(song?.duration || 0),
    format: String(format || "auto"),
  });

  const extraValue =
    typeof song?.extra === "string"
      ? song.extra
      : JSON.stringify(song?.extra || {});
  if (extraValue && extraValue !== "{}" && extraValue !== "null") {
    params.set("extra", extraValue);
  }

  return `${API_ROOT}/${endpoint}?${params.toString()}`;
}

function lyricURLsForSong(song) {
  return {
    download: buildLyricRequestURL(song, "download_lrc", "auto"),
  };
}

function updateDownloadButton(link) {
  if (!link) return;

  const card = link.closest(".song-card");
  if (!card) return;

  const ds = card.dataset;
  link.href = buildDownloadURL(
    ds.id,
    ds.source,
    ds.name,
    ds.artist,
    ds.album || "",
    ds.cover || "",
    ds.extra || "",
  );
  link.title = "保存到本地目录";
}

function updateBrowserDownloadButton(link) {
  if (!link) return;

  const card = link.closest(".song-card");
  if (!card) return;

  const ds = card.dataset;
  link.href = buildBrowserDownloadURL(
    ds.id,
    ds.source,
    ds.name,
    ds.artist,
    ds.album || "",
    ds.cover || "",
    ds.extra || "",
  );
  link.title = "浏览器下载";
}

function updateLyricButton(link) {
  if (!(link instanceof HTMLAnchorElement)) return;

  const card = link.closest(".song-card");
  const song = songFromCard(card);
  if (!song) return;

  link.href = lyricURLsForSong(song).download;
}

function buildCoverDownloadURL(song) {
  const source = String(song?.source || "");
  const params = new URLSearchParams();
  params.set(
    "url",
    String(song?.cover || "https://via.placeholder.com/600?text=No+Cover"),
  );
  params.set("name", String(song?.name || ""));
  params.set("artist", String(song?.artist || ""));
  return `${API_ROOT}/download_cover?${params.toString()}`;
}

function updateCoverButton(link) {
  if (!(link instanceof HTMLAnchorElement)) return;

  const card = link.closest(".song-card");
  const song = songFromCard(card);
  if (!song) return;

  link.href = buildCoverDownloadURL(song);
}

function refreshDownloadLinks(root = document) {
  root.querySelectorAll(".song-card").forEach((card) => {
    updateDownloadButton(card.querySelector(".btn-download"));
    updateBrowserDownloadButton(card.querySelector(".btn-browser-download"));
    updateLyricButton(card.querySelector(".btn-lyric"));
    updateCoverButton(card.querySelector(".btn-cover"));
  });
}

function withSaveLocalParam(url) {
  const target = new URL(String(url || ""), window.location.href);
  target.searchParams.set("save_local", "1");
  return target.toString();
}

async function requestLocalDownload(url) {
  const response = await fetch(withSaveLocalParam(url), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.error) {
    throw new Error((data && data.error) || "保存失败");
  }
  return data;
}

async function handleLyricLocalSave(link) {
  if (!link) return false;
  link.style.pointerEvents = "none";
  link.style.opacity = "0.6";
  try {
    const result = await requestLocalDownload(link.href);
    showToast(
      "歌词已保存",
      result.path || result.filename || "已保存到本地目录",
      "success",
      downloadNoticeDuration(),
    );
    return true;
  } catch (error) {
    showToast(
      "歌词保存失败",
      error.message || "请稍后重试",
      "error",
      downloadNoticeDuration(),
    );
    return false;
  } finally {
    link.style.pointerEvents = "";
    link.style.opacity = "";
  }
}

function formatBatchSongLabel(song) {
  const name = song && song.name ? song.name : "Unknown";
  const artist = song && song.artist ? song.artist : "Unknown";
  return `${name} - ${artist}`;
}

function buildBatchFailureMessage(failures, title) {
  if (!failures || failures.length === 0) {
    return "";
  }

  let message = `\n\n${title} ${failures.length} 首：`;
  failures.forEach((item, index) => {
    const reason = item.reason ? `：${item.reason}` : "";
    message += `\n${index + 1}. ${formatBatchSongLabel(item.song)}${reason}`;
  });
  return message;
}

function downloadNoticeDuration() {
  const seconds = Number(webSettings.downloadTipDuration);
  return (Number.isFinite(seconds) && seconds > 0
    ? Math.min(seconds, 60)
    : DEFAULT_DOWNLOAD_TIP_DURATION) * 1000;
}

function showToast(title, message = "", type = "info", duration = 0) {
  let container = document.getElementById("app-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "app-toast-container";
    container.className = "app-toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `app-toast app-toast-${type}`;
  toast.innerHTML = [
    '<button type="button" class="app-toast-close" aria-label="关闭提示">&times;</button>',
    `<div class="app-toast-title">${escapeHTML(title)}</div>`,
    message
      ? `<div class="app-toast-message">${escapeHTML(message)}</div>`
      : "",
  ].join("");
  container.appendChild(toast);

  const close = (immediate = false) => {
    if (!toast.isConnected) return;
    if (immediate) {
      toast.remove();
      return;
    }
    toast.remove();
  };
  toast.querySelector(".app-toast-close")?.addEventListener("click", () => close());
  if (duration > 0) {
    window.setTimeout(close, duration);
  }
  return close;
}

function inferExtFromContentType(contentType) {
  const raw = String(contentType || "")
    .toLowerCase()
    .split(";")[0]
    .trim();
  switch (raw) {
    case "audio/flac":
    case "audio/x-flac":
      return "flac";
    case "audio/ogg":
    case "application/ogg":
      return "ogg";
    case "audio/mp4":
    case "audio/x-m4a":
    case "audio/aac":
    case "audio/aacp":
      return "m4a";
    case "audio/x-ms-wma":
    case "audio/wma":
      return "wma";
    default:
      return "mp3";
  }
}

function getDownloadFilenameFromResponse(response, song) {
  const disposition = response.headers.get("Content-Disposition") || "";
  const encodedMatch = disposition.match(/filename\*\s*=\s*utf-8''([^;]+)/i);
  if (encodedMatch && encodedMatch[1]) {
    try {
      return decodeURIComponent(encodedMatch[1].trim().replace(/^"|"$/g, ""));
    } catch (_) {}
  }

  const plainMatch =
    disposition.match(/filename\s*=\s*"([^"]+)"/i) ||
    disposition.match(/filename\s*=\s*([^;]+)/i);
  if (plainMatch && plainMatch[1]) {
    return plainMatch[1].trim().replace(/^"|"$/g, "");
  }

  return `${formatBatchSongLabel(song)}.${inferExtFromContentType(response.headers.get("Content-Type"))}`;
}

async function requestBrowserDownload(song) {
  const url = String(song?.url || "").trim();
  if (!url) {
    throw new Error("下载地址为空");
  }

  let frame = document.getElementById("browser-download-frame");
  if (!frame) {
    frame = document.createElement("iframe");
    frame.id = "browser-download-frame";
    frame.name = "browser-download-frame";
    frame.style.display = "none";
    document.body.appendChild(frame);
  }

  const link = document.createElement("a");

  link.href = url;
  link.target = frame.name;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  await new Promise((resolve) => window.setTimeout(resolve, 250));

  return {
    triggered: true,
    warning: "",
  };
}

async function handleDownloadClick(link) {
  if (!link) return false;
  link.style.pointerEvents = "none";
  link.style.opacity = "0.6";
  try {
    const result = await enqueueDownloadURLs([link.href]);
    showToast("下载队列", result.added ? "已加入等待队列，可在右侧“下载管理”查看。" : "此歌曲已在等待或下载中。", "success", downloadNoticeDuration());
    return true;
  } catch (error) {
    showToast("加入队列失败", error.message, "error", downloadNoticeDuration());
    return false;
  } finally {
    link.style.pointerEvents = "";
    link.style.opacity = "";
  }
}

let navigationAbortController = null;
let pageNavigationEventsBound = false;
let songSortMode = "default";
let songSortDirection = "desc";

function isAppRoute(pathname) {
  return pathname === API_ROOT || pathname.startsWith(`${API_ROOT}/`);
}

function bindSourceSelectorButtons(root = document) {
  const checkboxes = root.querySelectorAll(".source-checkbox");

  const btnAll = document.getElementById("btn-all");
  if (btnAll) {
    btnAll.onclick = () => {
      checkboxes.forEach((cb) => {
        if (!cb.disabled) cb.checked = true;
      });
    };
  }

  const btnNone = document.getElementById("btn-none");
  if (btnNone) {
    btnNone.onclick = () => {
      checkboxes.forEach((cb) => {
        if (!cb.disabled) cb.checked = false;
      });
    };
  }
}

function isMobileSourceSelectorViewport() {
  try {
    return window.matchMedia("(max-width: 720px)").matches;
  } catch (_) {
    return (window.innerWidth || 0) <= 720;
  }
}

function applySourceSelectorCollapsed(selector, collapsed) {
  if (!selector) return;
  selector.classList.toggle("is-collapsed", !!collapsed);
  const btn = selector.querySelector(".source-collapse-btn");
  if (btn) btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
}

function toggleSourceSelector(force) {
  const selector = document.getElementById("source-selector");
  if (!selector) return;
  const collapsed =
    typeof force === "boolean"
      ? force
      : !selector.classList.contains("is-collapsed");
  applySourceSelectorCollapsed(selector, collapsed);
  try {
    sessionStorage.setItem("sourceSelectorCollapsed", collapsed ? "1" : "0");
  } catch (_) {}
}

function initSourceSelectorCollapse(root = document) {
  const scope =
    root && typeof root.querySelector === "function" ? root : document;
  const selector = scope.querySelector("#source-selector");
  if (!selector) return;
  if (selector.dataset.collapseInit === "1") return;
  selector.dataset.collapseInit = "1";

  const isMobile = isMobileSourceSelectorViewport();
  let collapsed;
  try {
    const stored = sessionStorage.getItem("sourceSelectorCollapsed");
    if (stored === "1" || stored === "0") {
      collapsed = stored === "1";
    }
  } catch (_) {}
  if (typeof collapsed !== "boolean") {
    collapsed = isMobile;
  }
  applySourceSelectorCollapsed(selector, collapsed);
}

function bindSearchForm(root = document) {
  const searchForm = root.querySelector("#search-form");
  if (!searchForm) return;

  searchForm.onsubmit = async (event) => {
    event.preventDefault();
    if (searchForm.dataset.loading === "1") return;

    const submitButton = searchForm.querySelector(".search-btn");
    const submitIcon = submitButton?.querySelector("i");
    searchForm.dataset.loading = "1";
    searchForm.setAttribute("aria-busy", "true");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.title = "搜索中";
    }
    if (submitIcon) {
      submitIcon.className = "fa-solid fa-spinner fa-spin";
    }

    const pageInput = searchForm.querySelector('input[name="page"]');
    if (pageInput) {
      pageInput.value = "1";
    }

    const targetURL = new URL(searchForm.action, window.location.href);
    const params = new URLSearchParams();
    new FormData(searchForm).forEach((value, key) => {
      params.append(key, String(value));
    });
    targetURL.search = params.toString();

    try {
      await navigateTo(targetURL.toString(), { scrollToResults: true });
    } finally {
      if (searchForm.isConnected) {
        delete searchForm.dataset.loading;
        searchForm.removeAttribute("aria-busy");
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.title = "搜索";
        }
        if (submitIcon) {
          submitIcon.className = "fa-solid fa-magnifying-glass";
        }
      }
    }
  };
}

function bindSongCardCovers(root = document) {
  const cards = root.querySelectorAll(".song-card");
  cards.forEach((card) => {
    if (songActionFoldMedia.matches) {
      ensureSongActionFold(card);
    }
    observeSongCardForInspect(card);
  });
}

const songActionFoldMedia = window.matchMedia("(max-width: 768px)");
const refreshSongActionFolds = () => {
  if (!songActionFoldMedia.matches) return;
  document.querySelectorAll(".song-card").forEach(ensureSongActionFold);
};
if (typeof songActionFoldMedia.addEventListener === "function") {
  songActionFoldMedia.addEventListener("change", refreshSongActionFolds);
} else {
  songActionFoldMedia.addListener(refreshSongActionFolds);
}

function ensureSongActionFold(card) {
  const actions = card?.querySelector(".actions");
  if (!actions) return;

  let moreActions = actions.querySelector(".mobile-more-actions");
  if (!moreActions) {
    moreActions = document.createElement("div");
    moreActions.className = "mobile-more-actions";
    actions.appendChild(moreActions);
  }

  Array.from(actions.children).forEach((action) => {
    if (action.classList.contains("btn-dl")) {
      moreActions.appendChild(action);
    }
  });

  let toggle = actions.querySelector(".mobile-more-toggle");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "btn-circle mobile-more-toggle";
    toggle.title = "更多下载操作";
    toggle.setAttribute("aria-label", "更多下载操作");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML =
      '<i class="fa-solid fa-ellipsis" aria-hidden="true"></i>';
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const expanded = !moreActions.classList.contains("is-open");
      moreActions.classList.toggle("is-open", expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.classList.toggle("is-open", expanded);
    });
    actions.appendChild(toggle);
  }

  const hasDownloadActions = Boolean(
    moreActions.querySelector(".btn-dl"),
  );
  toggle.hidden = !hasDownloadActions;
  if (!hasDownloadActions) {
    moreActions.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.classList.remove("is-open");
  }
}

function setSongActionMenuState(button, open) {
  const container = button?.closest(".action-more");
  const menu = container?.querySelector(".action-more-menu");
  if (!button || !menu) return;

  menu.hidden = !open;
  button.setAttribute("aria-expanded", String(open));
  button.classList.toggle("is-open", open);
  button.closest(".song-card")?.classList.toggle("menu-open", open);
}

function closeSongActionMenus(exceptButton = null) {
  document.querySelectorAll(".action-more-toggle").forEach((button) => {
    if (button !== exceptButton) setSongActionMenuState(button, false);
  });
}

function toggleSongActionMenu(button, event) {
  event?.preventDefault();
  event?.stopPropagation();
  if (!button) return;

  const shouldOpen =
    button.getAttribute("aria-expanded") !== "true" ||
    Boolean(button.closest(".action-more")?.querySelector(".action-more-menu")?.hidden);
  closeSongActionMenus(button);
  setSongActionMenuState(button, shouldOpen);
}

function initializePageContent(root = document) {
  resetAutoSwitchInvalidState();
  bindSourceSelectorButtons(root);
  initSourceSelectorCollapse(root);
  bindSearchForm(root);
  bindSongSortControls(root);
  bindSongListTools(root);

  const initialTypeEl = root.querySelector('input[name="type"]:checked');
  if (initialTypeEl) {
    toggleSearchType(initialTypeEl.value);
  }

  refreshDownloadLinks(root);
  bindSongCardCovers(root);
  updateBatchToolbar();
}

function setSongListToolsOpen(tools, isOpen) {
  if (!tools) return;
  const trigger = tools.querySelector(".song-list-tools-trigger");
  const popover = tools.querySelector(".song-list-tools-popover");
  if (!trigger || !popover) return;
  popover.hidden = !isOpen;
  trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function closeSongListTools() {
  document.querySelectorAll(".song-list-tools").forEach((tools) => {
    setSongListToolsOpen(tools, false);
  });
}

function toggleSongListTools(event) {
  event?.stopPropagation();
  const tools = event?.currentTarget?.closest(".song-list-tools");
  if (!tools) return;
  const popover = tools.querySelector(".song-list-tools-popover");
  const isOpen = popover ? !popover.hidden : false;
  closeSongListTools();
  setSongListToolsOpen(tools, !isOpen);
}

function bindSongListTools(root = document) {
  const scope = root && typeof root.querySelectorAll === "function" ? root : document;
  scope.querySelectorAll(".song-list-tools").forEach((tools) => {
    if (tools.dataset.bound === "1") return;
    tools.dataset.bound = "1";
    setSongListToolsOpen(tools, false);
  });
}

function shouldHandleInternalNavigation(link, event) {
  if (!link || event.defaultPrevented) return false;
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false;
  }
  if (link.hasAttribute("download")) return false;

  const hrefAttr = String(link.getAttribute("href") || "").trim();
  if (
    !hrefAttr ||
    hrefAttr.startsWith("#") ||
    hrefAttr.startsWith("javascript:") ||
    hrefAttr.startsWith("mailto:") ||
    hrefAttr.startsWith("tel:")
  ) {
    return false;
  }

  const targetAttr = String(link.getAttribute("target") || "")
    .trim()
    .toLowerCase();
  if (targetAttr && targetAttr !== "_self") {
    return false;
  }

  if (
    link.classList.contains("btn-download") ||
    link.classList.contains("btn-lyric") ||
    link.classList.contains("btn-cover")
  ) {
    return false;
  }

  let targetURL;
  try {
    targetURL = new URL(hrefAttr, window.location.href);
  } catch (_) {
    return false;
  }

  return (
    targetURL.origin === window.location.origin &&
    isAppRoute(targetURL.pathname)
  );
}

function syncRightToolbar(nextDoc, currentContainer) {
  const currentToolbar = document.querySelector(".right-toolbar");
  const nextToolbar = nextDoc.querySelector(".right-toolbar");

  if (!nextToolbar) {
    if (currentToolbar) currentToolbar.remove();
    return;
  }

  // 分页区由服务端按当前结果页生成，Ajax 导航时必须整体替换，避免保留上一页的按钮状态。
  if (currentToolbar) {
    currentToolbar.replaceWith(nextToolbar.cloneNode(true));
  } else if (currentContainer) {
    currentContainer.before(nextToolbar.cloneNode(true));
  }
  bindAuthFloat();
  refreshAuthFloat();
}

// 结果区顶部至少要有这么多像素可见，才认为用户已经能看到搜索结果。
const MIN_VISIBLE_RESULTS_PX = 120;

// 小屏首屏几乎被搜索框与搜索源面板占满，搜索后若仍停在页面
// 顶部，结果列表会落在首屏之外，用户会误以为"搜索为空"。这里把结果区（无结果
// 时为空状态提示）滚到视口顶部。结果区已有足够高度可见时不滚动，避免桌面端
// 无谓跳动。只在搜索提交时调用，分页/播放列表等内部导航保持原行为。
function scrollToSearchResults() {
  const target =
    document.querySelector(".list-header") ||
    document.querySelector(".no-results");
  if (!target) {
    return;
  }

  const rect = target.getBoundingClientRect();
  if (rect.top >= 0 && window.innerHeight - rect.top >= MIN_VISIBLE_RESULTS_PX) {
    return;
  }

  window.scrollTo({
    top: Math.max(rect.top + window.scrollY - 12, 0),
    behavior: "auto",
  });
}

function navigateBack() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  void navigateTo(API_ROOT + "/");
}

async function navigateTo(url, options = {}) {
  let targetURL;
  try {
    targetURL = new URL(url, window.location.href);
  } catch (_) {
    return false;
  }

  if (
    targetURL.origin !== window.location.origin ||
    !isAppRoute(targetURL.pathname)
  ) {
    window.location.href = targetURL.toString();
    return false;
  }

  if (navigationAbortController) {
    navigationAbortController.abort();
  }

  const controller = new AbortController();
  navigationAbortController = controller;

  try {
    const response = await fetch(targetURL.toString(), {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const nextDoc = parser.parseFromString(html, "text/html");
    const nextContainer = nextDoc.querySelector(".container");
    const currentContainer = document.querySelector(".container");

    if (!nextContainer || !currentContainer) {
      throw new Error("missing container");
    }

    cancelPendingSongInspections();
    currentContainer.innerHTML = nextContainer.innerHTML;
    syncRightToolbar(nextDoc, currentContainer);
    if (nextDoc.title) document.title = nextDoc.title;

    const renderedPage = nextContainer.querySelector(".page-summary");
    const renderedPageMatch = renderedPage
      ? renderedPage.textContent.match(/(\d+)\s*\/\s*(\d+)/)
      : null;
    if (renderedPageMatch && targetURL.searchParams.has("page")) {
      targetURL.searchParams.set("page", renderedPageMatch[1]);
    }

    const historyMode = options.historyMode || "push";
    if (historyMode === "replace") {
      window.history.replaceState(null, "", targetURL.toString());
    } else if (historyMode !== "none") {
      if (targetURL.toString() === window.location.href) {
        window.history.replaceState(null, "", targetURL.toString());
      } else {
        window.history.pushState(null, "", targetURL.toString());
      }
    }

    initializePageContent(currentContainer);
    updateFloatPageNav();

    if (options.scrollToResults) {
      scrollToSearchResults();
    } else if (options.scroll !== false) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    return true;
  } catch (error) {
    if (error && error.name === "AbortError") {
      return false;
    }
    window.location.href = targetURL.toString();
    return false;
  } finally {
    if (navigationAbortController === controller) {
      navigationAbortController = null;
    }
  }
}

function refreshCurrentPageContent(options = {}) {
  return navigateTo(window.location.href, {
    historyMode: "replace",
    scroll: false,
    ...options,
  });
}

function isEditableElement(element) {
  if (!(element instanceof Element)) return false;
  if (element.isContentEditable) return true;
  return !!element.closest(
    '[contenteditable=""], [contenteditable="true"], input, textarea, select',
  );
}

function hasVisibleModalOverlay() {
  if (document.querySelector("dialog[open]")) return true;
  return Array.from(document.querySelectorAll(".modal-overlay")).some(
    (overlay) => {
      return window.getComputedStyle(overlay).display !== "none";
    },
  );
}

function getActivePaginationState() {
  const paginationBar = Array.from(
    document.querySelectorAll(
      ".pagination-bar[data-current-page][data-total-pages]",
    ),
  ).find((bar) => bar.offsetParent !== null);
  if (!paginationBar) return null;

  const currentPage = parsePositiveInt(paginationBar.dataset.currentPage, 1);
  const totalPages = parsePositiveInt(paginationBar.dataset.totalPages, 1);
  if (totalPages <= 1) return null;

  return { currentPage, totalPages };
}

function handlePaginationShortcut(event) {
  if (event.defaultPrevented || event.isComposing) return;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (
    isEditableElement(event.target) ||
    isEditableElement(document.activeElement)
  )
    return;
  if (hasVisibleModalOverlay()) return;

  let delta = 0;
  if (event.key === "PageUp") {
    delta = -1;
  } else if (event.key === "PageDown") {
    delta = 1;
  }
  if (delta === 0) return;

  const state = getActivePaginationState();
  if (!state) return;

  const nextPage = state.currentPage + delta;
  if (nextPage < 1 || nextPage > state.totalPages) return;

  event.preventDefault();
  goToPage(nextPage);
}

function bindPageNavigationEvents() {
  if (pageNavigationEventsBound) return;
  pageNavigationEventsBound = true;

  document.addEventListener("click", async function (event) {
    const link = event.target.closest(".btn-download");
    if (!link) return;
    event.preventDefault();
    await handleDownloadClick(link);
  });

  document.addEventListener("click", async function (event) {
    const link = event.target.closest(".btn-lyric");
    if (!link || !webSettings.downloadLyricsToLocal) return;
    event.preventDefault();
    await handleLyricLocalSave(link);
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".song-list-tools")) {
      closeSongListTools();
    }
  });

  document.addEventListener("click", function (event) {
    const menuAction = event.target.closest(
      ".action-more-menu a, .action-more-menu button",
    );
    if (menuAction) {
      window.setTimeout(() => closeSongActionMenus(), 0);
      return;
    }
    if (!event.target.closest(".action-more")) {
      closeSongActionMenus();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    const openButton = document.querySelector(
      '.action-more-toggle[aria-expanded="true"]',
    );
    if (!openButton) return;
    closeSongActionMenus();
    openButton.focus();
  });

  document.addEventListener(
    "click",
    function (event) {
      const link = event.target.closest("a");
      if (!shouldHandleInternalNavigation(link, event)) return;

      event.preventDefault();
      navigateTo(link.href);
    },
    true,
  );

  document.addEventListener("keydown", handlePaginationShortcut);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeSongListTools();
  });

  window.addEventListener("popstate", function () {
    navigateTo(window.location.href, {
      historyMode: "none",
      scroll: false,
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  loadWebSettingsFromCache();
  applyWebSettings(webSettings);
  bindSettingsTabs();
  bindAuthFloat();
  refreshAuthFloat();
  fetchWebSettings();
  bindPageNavigationEvents();
  initializePageContent(document);
  updateFloatPageNav();
  // 直接打开搜索结果链接，或 SPA 失败回退到整页加载时，同样把结果滚入视口。
  // 仅在 URL 带搜索词时触发，普通页面加载不受影响。
  if (new URLSearchParams(window.location.search).get("q")) {
    scrollToSearchResults();
  }
  if (
    new URLSearchParams(window.location.search).get(OPEN_CONFIG_QUERY) === "1"
  ) {
    const url = new URL(window.location.href);
    url.searchParams.delete(OPEN_CONFIG_QUERY);
    window.history.replaceState(null, "", url.toString());
    openSystemConfig();
  }
});

function toggleSearchType(type) {
  const checkboxes = document.querySelectorAll(".source-checkbox");
  const searchInput = document.getElementById("search-keyword");
  const placeholders = {
    song: "搜索歌曲、歌手，或直接粘贴分享链接",
    playlist: "搜索歌单、创建者，或直接粘贴歌单链接",
    album: "搜索专辑、歌手，或直接粘贴专辑链接",
  };

  if (searchInput && placeholders[type]) {
    searchInput.placeholder = placeholders[type];
  }

  checkboxes.forEach((cb) => {
    let isSupported = true;
    if (type === "playlist") {
      isSupported = cb.dataset.playlistSupported === "true";
    } else if (type === "album") {
      isSupported = cb.dataset.albumSupported === "true";
    }

    if (type === "playlist" || type === "album") {
      if (!isSupported) {
        cb.disabled = true;
        cb.checked = false;
      } else {
        cb.disabled = false;
      }
    } else {
      cb.disabled = false;
    }
  });
}

function switchCategorySource(tab) {
  if (!tab) return;
  const panelId = tab.getAttribute("data-target");
  if (!panelId) return;
  const scope = tab.closest(".category-panel") || document;
  scope.querySelectorAll(".category-source-tab").forEach(function (t) {
    t.classList.toggle("is-active", t === tab);
  });
  scope.querySelectorAll(".category-source-panel").forEach(function (p) {
    p.classList.toggle("is-active", p.id === panelId);
  });
}

function goToPlaylistCategories() {
  const selected = [];
  document.querySelectorAll(".source-checkbox:checked").forEach((cb) => {
    if (cb.dataset.categorySupported === "true") {
      selected.push(cb.value);
    }
  });

  if (selected.length === 0) {
    navigateTo(API_ROOT + "/playlist_categories");
  } else {
    navigateTo(
      API_ROOT +
        "/playlist_categories?sources=" +
        selected.map(encodeURIComponent).join("&sources="),
    );
  }
}

function goToTopLists() {
  const selected = [];
  document.querySelectorAll(".source-checkbox:checked").forEach((cb) => {
    if (cb.dataset.toplistSupported === "true") {
      selected.push(cb.value);
    }
  });

  if (selected.length === 0) {
    navigateTo(API_ROOT + "/toplists");
  } else {
    navigateTo(
      API_ROOT +
        "/toplists?sources=" +
        selected.map(encodeURIComponent).join("&sources="),
    );
  }
}

function submitPageJump(event, form, onPageChange = goToPage) {
  event.preventDefault();
  const input = form.querySelector("input");
  if (!input || !input.reportValidity()) return false;
  const page = Number(input.value);
  if (Number.isInteger(page) && page >= 1) onPageChange(page);
  return false;
}

function renderPageJump(page, totalPages, onPageChange = "goToPage") {
  return `<form class="page-jump" onsubmit="return submitPageJump(event,this,${onPageChange})"><label>跳至 <input type="number" min="1" max="${totalPages}" step="1" value="${page}" required aria-label="目标页码" inputmode="numeric"> 页</label><button type="submit" class="utility-modal-page-button" aria-label="跳转到指定页">跳转</button></form>`;
}

function goToPage(page, pageSize) {
  const target = parseInt(page, 10);
  if (!Number.isFinite(target) || target < 1) return;
  const url = new URL(window.location.href);
  url.searchParams.set("page", String(target));
  const ps = parseInt(pageSize, 10);
  if (Number.isFinite(ps) && ps > 0) {
    url.searchParams.set("page_size", String(ps));
  }
  navigateTo(url.toString());
}

function changePageSize(size) {
  // 同时更新隐藏的 form 输入和下拉框
  const hiddenInput = document.getElementById("page-size-hidden");
  if (hiddenInput) hiddenInput.value = String(size);

  const dropdown = document.getElementById("page-size-select");
  if (dropdown) dropdown.value = String(size);

  const url = new URL(window.location.href);
  url.searchParams.set("page_size", String(size));
  url.searchParams.set("page", "1");
  window.location.href = url.toString();
}

function parsePositiveInt(value, fallbackValue) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }
  return parsed;
}

function parseSizeToBytes(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw || raw === "-" || raw === "无效" || raw === "检测失败") return 0;
  const match = raw.match(/([\d.]+)\s*([kmgt]?i?b|[kmgt])?/i);
  if (!match) return parsePositiveInt(raw, 0);
  const number = Number.parseFloat(match[1]);
  if (!Number.isFinite(number) || number <= 0) return 0;
  const unit = String(match[2] || "b").toLowerCase();
  const multipliers = {
    b: 1,
    k: 1024,
    kb: 1024,
    kib: 1024,
    m: 1024 ** 2,
    mb: 1024 ** 2,
    mib: 1024 ** 2,
    g: 1024 ** 3,
    gb: 1024 ** 3,
    gib: 1024 ** 3,
    t: 1024 ** 4,
    tb: 1024 ** 4,
    tib: 1024 ** 4,
  };
  return Math.round(number * (multipliers[unit] || 1));
}

function parseBitrateToKbps(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw || raw === "-") return 0;
  const match = raw.match(/([\d.]+)\s*(k|kbps|kbit\/s|m|mbps|mbit\/s)?/i);
  if (!match) return parsePositiveInt(raw, 0);
  const number = Number.parseFloat(match[1]);
  if (!Number.isFinite(number) || number <= 0) return 0;
  const unit = String(match[2] || "kbps").toLowerCase();
  return unit.startsWith("m") ? Math.round(number * 1000) : Math.round(number);
}

function ensureSongSortIndexes(root = document) {
  const scope =
    root && typeof root.querySelectorAll === "function" ? root : document;
  const cards = Array.from(
    scope.matches && scope.matches(".result-list")
      ? scope.querySelectorAll(".song-card")
      : scope.querySelectorAll(".result-list .song-card"),
  );
  cards.forEach((card, index) => {
    if (!card.dataset.sortIndex) {
      card.dataset.sortIndex = String(index);
    }
    const sortDuration = String(parsePositiveInt(card.dataset.duration, 0));
    if (card.dataset.sortDuration !== sortDuration) {
      card.dataset.sortDuration = sortDuration;
    }
    const sortSize = String(parseSizeToBytes(card.dataset.sortSize || ""));
    if (card.dataset.sortSize !== sortSize) {
      card.dataset.sortSize = sortSize;
    }
    const sortBitrate = String(
      parseBitrateToKbps(card.dataset.sortBitrate || ""),
    );
    if (card.dataset.sortBitrate !== sortBitrate) {
      card.dataset.sortBitrate = sortBitrate;
    }
  });
}

function songSortValue(card, mode) {
  switch (mode) {
    case "quality":
      return parsePositiveInt(card.dataset.sortBitrate, 0);
    case "size":
      return parsePositiveInt(card.dataset.sortSize, 0);
    case "duration":
      return parsePositiveInt(
        card.dataset.sortDuration || card.dataset.duration,
        0,
      );
    default:
      return parsePositiveInt(card.dataset.sortIndex, 0);
  }
}

function applySongSort(root = document) {
  const scope =
    root && typeof root.querySelector === "function" ? root : document;
  const list =
    scope.matches && scope.matches(".result-list")
      ? scope
      : scope.querySelector(".result-list") ||
        document.querySelector(".result-list");
  if (!list) return;
  ensureSongSortIndexes(list);

  const cards = Array.from(list.querySelectorAll(".song-card"));
  const direction = songSortDirection === "asc" ? 1 : -1;
  const sortedCards = cards.slice().sort((a, b) => {
    if (songSortMode === "default") {
      return (
        parsePositiveInt(a.dataset.sortIndex, 0) -
        parsePositiveInt(b.dataset.sortIndex, 0)
      );
    }
    const delta =
      songSortValue(a, songSortMode) - songSortValue(b, songSortMode);
    if (delta !== 0) return delta * direction;
    return (
      parsePositiveInt(a.dataset.sortIndex, 0) -
      parsePositiveInt(b.dataset.sortIndex, 0)
    );
  });
  if (cards.every((card, index) => card === sortedCards[index])) {
    return;
  }

  const fragment = document.createDocumentFragment();
  sortedCards.forEach((card) => fragment.appendChild(card));
  list.appendChild(fragment);
}

function syncSongSortControls(root = document) {
  const scope =
    root && typeof root.querySelector === "function" ? root : document;
  const select =
    scope.querySelector("#song-sort-select") ||
    document.getElementById("song-sort-select");
  if (select) select.value = songSortMode;

  const button =
    scope.querySelector("#song-sort-direction") ||
    document.getElementById("song-sort-direction");
  if (!button) return;
  const descending = songSortDirection !== "asc";
  button.title = descending ? "降序" : "升序";
  button.innerHTML = descending
    ? '<i class="fa-solid fa-arrow-down-wide-short"></i>'
    : '<i class="fa-solid fa-arrow-up-wide-short"></i>';
}

function setSongSortMode(mode) {
  songSortMode = ["default", "quality", "size", "duration"].includes(mode)
    ? mode
    : "default";
  syncSongSortControls();
  applySongSort();
}

function toggleSongSortDirection() {
  songSortDirection = songSortDirection === "asc" ? "desc" : "asc";
  syncSongSortControls();
  applySongSort();
}

function bindSongSortControls(root = document) {
  ensureSongSortIndexes(root);
  syncSongSortControls(root);
  applySongSort(root);
}

function normalizeSongExtra(extra) {
  if (!extra) return {};
  if (typeof extra === "object" && !Array.isArray(extra)) return extra;
  if (typeof extra === "string") {
    try {
      const parsed = JSON.parse(extra);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_) {}
  }
  return {};
}

function serializeSongExtra(extra) {
  return JSON.stringify(normalizeSongExtra(extra));
}

function songFromCard(card) {
  if (!card) return null;
  const ds = card.dataset;
  if (!ds.id || !ds.source) return null;

  let coverUrl = ds.cover || "";
  const imgEl = card.querySelector(".cover-wrapper img");
  if (imgEl && imgEl.src) {
    coverUrl = imgEl.src;
  }

  return {
    id: ds.id,
    source: ds.source,
    name: ds.name || "",
    artist: ds.artist || "",
    album: ds.album || "",
    duration: parsePositiveInt(ds.duration, 0),
    cover: coverUrl,
    extra: ds.extra || "",
  };
}

function setSongInspectLoading(card, loading) {
  if (!card) return;
  const sizeTag =
    document.getElementById(`size-${card.dataset.id}`) ||
    card.querySelector('[id^="size-"]');
  const bitrateTag =
    document.getElementById(`bitrate-${card.dataset.id}`) ||
    card.querySelector('[id^="bitrate-"]');

  if (loading) {
    if (sizeTag) {
      sizeTag.className = "tag tag-loading";
      sizeTag.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
    }
    if (bitrateTag) {
      bitrateTag.className = "tag tag-loading";
      bitrateTag.innerHTML = '<i class="fa fa-circle-notch fa-spin"></i>';
    }
    return;
  }

  if (sizeTag?.querySelector(".fa-spin")) {
    sizeTag.textContent = "-";
    sizeTag.className = "tag";
  }
  if (bitrateTag?.querySelector(".fa-spin")) {
    bitrateTag.textContent = "-";
    bitrateTag.className = "tag";
  }
}

async function inspectSong(card, controller = null) {
  if (!card) return;
  const signal = controller ? controller.signal : undefined;
  const id = card.dataset.id;
  const source = card.dataset.source;
  const duration = card.dataset.duration;
  const extra = card.dataset.extra || "";
  const requestInspectKey = card.dataset.inspectKey || "";
  let retryDelay = 0;

  const params = new URLSearchParams({
    id: String(id || ""),
    source: String(source || ""),
    duration: String(duration || ""),
  });
  if (extra !== "" && extra !== "{}" && extra !== "null") {
    params.set("extra", extra);
  }

  try {
    const response = await fetch(`${API_ROOT}/inspect?${params.toString()}`, {
      signal,
    });
    if (signal && signal.aborted) return;
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.httpStatus = response.status;
      error.retryAfterMs = parseInspectRetryAfter(
        response.headers.get("Retry-After"),
      );
      throw error;
    }

    const data = await response.json();
    if (
      (signal && signal.aborted) ||
      !card.isConnected ||
      card.dataset.inspectKey !== requestInspectKey ||
      !data ||
      typeof data !== "object"
    ) {
      return;
    }
    if (typeof data.valid !== "boolean") {
      throw new Error("invalid inspect response");
    }

    if (data.song && typeof data.song === "object") {
      updateCardWithSong(card, data.song, { inspect: false });
    }

    const currentId = card.dataset.id || id;
    const sizeTag =
      document.getElementById(`size-${currentId}`) ||
      card.querySelector('[id^="size-"]');
    const bitrateTag =
      document.getElementById(`bitrate-${currentId}`) ||
      card.querySelector('[id^="bitrate-"]');

    if (data.valid) {
      const previewOnly = data.preview_only === true;
      inspectRetryCounts.delete(card);
      delete card.dataset.inspectRetryable;
      delete card.dataset.autoSwitchRetryable;
      card.dataset.inspectCompleted = "1";
      if (previewOnly) {
        card.dataset.previewOnly = "1";
      } else {
        delete card.dataset.previewOnly;
      }
      if (sizeTag) {
        sizeTag.textContent = previewOnly
          ? `${data.size || "-"} · 试听`
          : data.size;
        sizeTag.className = previewOnly
          ? "tag tag-success tag-preview"
          : "tag tag-success";
        if (previewOnly) {
          sizeTag.title = "Spotify 仅提供试听片段";
        } else {
          sizeTag.removeAttribute("title");
        }
      }
      if (bitrateTag) {
        bitrateTag.textContent = previewOnly ? "试听" : data.bitrate;
        bitrateTag.className = previewOnly ? "tag tag-preview" : "tag";
        if (previewOnly) {
          bitrateTag.title = "试听可用，不会自动换源";
        } else {
          bitrateTag.removeAttribute("title");
        }
      }
      card.dataset.sortSize = String(parseSizeToBytes(data.size));
      card.dataset.sortBitrate = String(parseBitrateToKbps(data.bitrate));
      if (data.duration) {
        card.dataset.sortDuration = String(
          parsePositiveInt(
            data.duration,
            parsePositiveInt(card.dataset.duration, 0),
          ),
        );
      }
      recordInspectSourceSuccess(source);
    } else if (data.retryable === true || data.status === "retryable") {
      delete card.dataset.previewOnly;
      const suggestedDelay = Math.max(
        parsePositiveInt(data.retry_after_ms, 0),
        parseInspectRetryAfter(response.headers.get("Retry-After")),
      );
      retryDelay = recordInspectSourcePressure(source, suggestedDelay);
      card.dataset.inspectRetryable = "1";
      const retryReason = String(data.reason || "").toLowerCase();
      if (retryReason === "rate_limited") {
        delete card.dataset.autoSwitchRetryable;
      } else {
        card.dataset.autoSwitchRetryable = "1";
      }
      if (sizeTag) {
        sizeTag.textContent = "稍后重试";
        sizeTag.className = "tag tag-loading";
        sizeTag.title = data.reason
          ? `平台暂不可用：${data.reason}`
          : "平台暂不可用";
      }
      if (bitrateTag) {
        bitrateTag.textContent = "-";
        bitrateTag.className = "tag";
      }
    } else {
      delete card.dataset.previewOnly;
      inspectRetryCounts.delete(card);
      delete card.dataset.inspectRetryable;
      delete card.dataset.autoSwitchRetryable;
      card.dataset.inspectCompleted = "1";
      if (sizeTag) {
        sizeTag.textContent = "无效";
        sizeTag.className = "tag tag-fail";
      }
      if (bitrateTag) {
        bitrateTag.textContent = "-";
        bitrateTag.className = "tag";
      }
      card.dataset.sortSize = "0";
      card.dataset.sortBitrate = "0";
    }
    if (songSortMode !== "default") {
      applySongSort();
    }
  } catch (error) {
    if (
      error &&
      (error.name === "AbortError" || signal?.aborted || !card.isConnected)
    ) {
      return;
    }
    if (card.dataset.inspectKey !== requestInspectKey) {
      return;
    }
    retryDelay = recordInspectSourcePressure(
      source,
      parsePositiveInt(error?.retryAfterMs, 0),
    );
    delete card.dataset.previewOnly;
    const el = card.querySelector('[id^="size-"]');
    if (el) el.textContent = "检测失败";
  } finally {
    setSongInspectLoading(card, false);
    delete card.dataset.inspectPending;
    if (
      retryDelay > 0 &&
      card.isConnected &&
      (!signal || !signal.aborted)
    ) {
      const preparedRetryDelay = prepareInspectRetry(card, retryDelay);
      if (preparedRetryDelay > 0) {
        scheduleInspectRetry(card, preparedRetryDelay);
      } else if (card.dataset.inspectRetryable === "1") {
        card.dataset.autoSwitchRetryable = "1";
      }
    }
    if (controller) {
      finishInspectSong(controller);
    }
    const requestIsStale =
      card.isConnected && card.dataset.inspectKey !== requestInspectKey;
    if (
      requestIsStale &&
      (!signal || !signal.aborted) &&
      card.dataset.inspectCompleted !== "1"
    ) {
      queueInspectSong(card, 0);
    }
    if (
      card.isConnected &&
      (!signal || !signal.aborted) &&
      card.dataset.inspectKey === requestInspectKey &&
      (document.querySelector(".tag-fail") ||
        card.dataset.autoSwitchRetryable === "1")
    ) {
      scheduleAutoSwitchInvalidSources();
    }
  }
}

const inspectReadyQueue = [];
const inspectPendingTimers = new Set();
const inspectPendingCards = new Set();
const inspectActiveRequests = new Map();
const inspectSourceStates = new Map();
let inspectRetryCounts = new WeakMap();
let inspectPumpTimer = 0;
let inspectPumpAt = 0;

function inspectNow() {
  return window.performance && typeof window.performance.now === "function"
    ? window.performance.now()
    : Date.now();
}

function parseInspectRetryAfter(value) {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return Math.min(INSPECT_RETRY_MAX_DELAY_MS, Math.round(numeric * 1000));
  }
  const timestamp = Date.parse(String(value));
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(
    0,
    Math.min(INSPECT_RETRY_MAX_DELAY_MS, timestamp - Date.now()),
  );
}

function getInspectSourceState(source) {
  const key = String(source || "unknown");
  let state = inspectSourceStates.get(key);
  if (!state) {
    state = {
      active: 0,
      maxConcurrency: INSPECT_SOURCE_MAX_CONCURRENCY,
      nextAvailableAt: 0,
      cooldownUntil: 0,
      successStreak: 0,
      failureCount: 0,
    };
    inspectSourceStates.set(key, state);
  }
  return state;
}

function recordInspectSourceSuccess(source) {
  const state = getInspectSourceState(source);
  state.failureCount = 0;
  state.successStreak++;
  if (
    state.maxConcurrency < INSPECT_SOURCE_MAX_CONCURRENCY &&
    state.successStreak >= 5
  ) {
    state.maxConcurrency++;
    state.successStreak = 0;
  }
}

function recordInspectSourcePressure(source, requestedDelay = 0) {
  const state = getInspectSourceState(source);
  state.successStreak = 0;
  const now = inspectNow();
  if (now >= state.cooldownUntil) {
    state.failureCount = Math.min(5, state.failureCount + 1);
    state.maxConcurrency = Math.max(
      INSPECT_SOURCE_MIN_CONCURRENCY,
      Math.floor(state.maxConcurrency / 2),
    );
    const exponentialDelay = Math.min(
      INSPECT_RETRY_MAX_DELAY_MS,
      INSPECT_RETRY_BASE_DELAY_MS * 2 ** (state.failureCount - 1),
    );
    const delay = Math.max(
      parsePositiveInt(requestedDelay, 0),
      exponentialDelay + Math.floor(Math.random() * 350),
    );
    state.cooldownUntil = now + delay;
  } else if (requestedDelay > 0) {
    state.cooldownUntil = Math.max(
      state.cooldownUntil,
      now + parsePositiveInt(requestedDelay, 0),
    );
  }
  state.nextAvailableAt = Math.max(state.nextAvailableAt, state.cooldownUntil);
  return Math.max(0, state.cooldownUntil - now);
}

function prepareInspectRetry(card, requestedDelay) {
  if (!card || !card.isConnected) return 0;
  const retries = inspectRetryCounts.get(card) || 0;
  if (retries >= INSPECT_MAX_RETRIES) return 0;
  inspectRetryCounts.set(card, retries + 1);
  card.dataset.inspectRetryAttempt = String(retries + 1);
  return Math.min(
    INSPECT_RETRY_MAX_DELAY_MS,
    Math.max(
      parsePositiveInt(requestedDelay, 0),
      INSPECT_RETRY_BASE_DELAY_MS * 2 ** retries,
    ) + Math.floor(Math.random() * 350),
  );
}

function scheduleInspectRetry(card, delay) {
  if (!card || delay <= 0) return;
  const timer = window.setTimeout(() => {
    inspectPendingTimers.delete(timer);
    if (!card.isConnected) return;
    queueInspectSong(card, 0);
  }, delay);
  inspectPendingTimers.add(timer);
}

function pumpInspectQueue() {
  while (
    inspectActiveRequests.size < INSPECT_MAX_CONCURRENCY &&
    inspectReadyQueue.length > 0
  ) {
    const now = inspectNow();
    let selectedIndex = -1;
    let selectedSource = "";
    let earliestWait = Infinity;

    for (let index = 0; index < inspectReadyQueue.length; index++) {
      const candidate = inspectReadyQueue[index];
      if (!candidate?.isConnected) {
        if (candidate) {
          delete candidate.dataset.inspectPending;
          inspectPendingCards.delete(candidate);
        }
        inspectReadyQueue.splice(index, 1);
        index--;
        continue;
      }

      const source = candidate.dataset.source || "unknown";
      const state = getInspectSourceState(source);
      if (state.active >= state.maxConcurrency) continue;
      const availableAt = Math.max(
        state.cooldownUntil,
        state.nextAvailableAt,
      );
      if (availableAt > now) {
        earliestWait = Math.min(earliestWait, availableAt - now);
        continue;
      }
      selectedIndex = index;
      selectedSource = source;
      break;
    }

    if (selectedIndex < 0) {
      if (Number.isFinite(earliestWait)) {
        scheduleInspectPump(earliestWait);
      }
      return;
    }

    const card = inspectReadyQueue.splice(selectedIndex, 1)[0];
    const state = getInspectSourceState(selectedSource);
    const controller = new AbortController();
    inspectActiveRequests.set(controller, {
      card,
      source: selectedSource,
    });
    state.active++;
    state.nextAvailableAt = now + INSPECT_REQUEST_DELAY_MS;
    setSongInspectLoading(card, true);
    void inspectSong(card, controller);
  }
}

function scheduleInspectPump(delay = 0) {
  const now = inspectNow();
  const at = now + Math.max(0, delay);
  if (inspectPumpTimer && inspectPumpAt <= at) return;
  if (inspectPumpTimer) {
    window.clearTimeout(inspectPumpTimer);
  }
  inspectPumpAt = at;
  inspectPumpTimer = window.setTimeout(() => {
    inspectPumpTimer = 0;
    inspectPumpAt = 0;
    pumpInspectQueue();
  }, Math.max(0, delay));
}

function finishInspectSong(controller) {
  const task = inspectActiveRequests.get(controller);
  if (!task) return;
  inspectActiveRequests.delete(controller);
  inspectPendingCards.delete(task.card);
  const state = getInspectSourceState(task.source);
  state.active = Math.max(0, state.active - 1);
  pumpInspectQueue();
}

function cancelPendingSongInspections() {
  inspectViewportObserver?.disconnect();
  inspectPendingTimers.forEach((timer) => window.clearTimeout(timer));
  inspectPendingTimers.clear();

  inspectPendingCards.forEach((card) => {
    delete card.dataset.inspectPending;
  });
  inspectPendingCards.clear();
  inspectReadyQueue.length = 0;
  inspectRetryCounts = new WeakMap();

  if (inspectPumpTimer) {
    window.clearTimeout(inspectPumpTimer);
    inspectPumpTimer = 0;
    inspectPumpAt = 0;
  }

  inspectActiveRequests.forEach((task, controller) => {
    const card = task.card;
    delete card.dataset.inspectPending;
    setSongInspectLoading(card, false);
    controller.abort();
  });
  inspectActiveRequests.clear();
  inspectSourceStates.forEach((state) => {
    state.active = 0;
  });
}

const inspectViewportObserver =
  typeof IntersectionObserver === "function"
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            inspectViewportObserver.unobserve(entry.target);
            queueInspectSong(entry.target);
          }
        },
        { rootMargin: "300px 0px" },
      )
    : null;

function observeSongCardForInspect(card) {
  if (!card) return;
  if (!inspectViewportObserver) {
    queueInspectSong(card);
    return;
  }
  inspectViewportObserver.observe(card);
}

function queueInspectSong(card, delay = 0) {
  if (
    !card ||
    !card.isConnected
  ) {
    return;
  }
  const inspectKey = [
    card.dataset.source || "",
    card.dataset.id || "",
    card.dataset.extra || "",
  ].join(":");
  if (card.dataset.inspectKey !== inspectKey) {
    card.dataset.inspectKey = inspectKey;
    delete card.dataset.inspectCompleted;
    delete card.dataset.inspectRetryable;
    delete card.dataset.autoSwitchRetryable;
    inspectRetryCounts.delete(card);
  }
  if (card.dataset.inspectPending === "1") return;
  if (card.dataset.inspectCompleted === "1") return;

  card.dataset.inspectPending = "1";
  inspectPendingCards.add(card);
  if (delay <= 0) {
    inspectReadyQueue.push(card);
    scheduleInspectPump(0);
    return;
  }
  const timer = window.setTimeout(() => {
    inspectPendingTimers.delete(timer);
    if (!card.isConnected) {
      inspectPendingCards.delete(card);
      delete card.dataset.inspectPending;
      return;
    }
    inspectReadyQueue.push(card);
    scheduleInspectPump(0);
  }, Math.max(0, delay));
  inspectPendingTimers.add(timer);
}

const QR_LOGIN_SOURCE_LABELS = {
  netease: "网易云音乐",
  qq: "QQ音乐",
  qq_wx: "QQ音乐微信",
  kugou: "酷狗音乐",
  bilibili: "Bilibili",
  soda: "汽水音乐",
};
const QR_LOGIN_COOKIE_SOURCES = {
  qq_wx: "qq",
};
const QR_LOGIN_POLL_INTERVAL_MS = {
  soda: 2000,
};

let qrLoginState = {
  source: "",
  key: "",
  baseKey: "",
  pollTimer: 0,
  pollBusy: false,
  smsBusy: false,
  sms: {
    encryptUID: "",
    verifyParams: "",
    codeSent: false,
    mode: "",
    upSMSMobile: "",
    upSMSContent: "",
  },
};

function qrLoginSourceLabel(source) {
  return QR_LOGIN_SOURCE_LABELS[source] || source;
}

function qrLoginCookieSource(source) {
  return QR_LOGIN_COOKIE_SOURCES[source] || source;
}

function clearQRLoginPoll() {
  if (qrLoginState.pollTimer) {
    window.clearInterval(qrLoginState.pollTimer);
    qrLoginState.pollTimer = 0;
  }
  qrLoginState.pollBusy = false;
}

function setQRLoginStatus(message, type = "") {
  const el = document.getElementById("qrLoginStatus");
  if (!el) return;
  el.textContent = message || "";
  el.className = "qr-login-status" + (type ? ` ${type}` : "");
}

function setQRLoginLoading(show, message = "正在生成二维码...") {
  const el = document.getElementById("qrLoginLoading");
  if (!el) return;
  el.textContent = message;
  el.style.display = show ? "flex" : "none";
}

function resetQRLoginSMSView() {
  const panel = document.getElementById("qrLoginSMSPanel");
  const input = document.getElementById("qrLoginSMSCode");
  const sendBtn = document.getElementById("qrLoginSendSMSBtn");
  const validateBtn = document.getElementById("qrLoginValidateSMSBtn");
  if (panel) panel.style.display = "none";
  if (input) {
    if (!input.dataset.qrSmsBound) {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") validateSodaSMSCode();
      });
      input.dataset.qrSmsBound = "true";
    }
    input.value = "";
    input.disabled = false;
    input.style.display = "";
  }
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.textContent = "发送验证码";
  }
  if (validateBtn) {
    validateBtn.disabled = false;
    validateBtn.style.display = "";
    validateBtn.textContent = "确认登录";
  }
}

function qrLoginResultExtra(result) {
  const extra = result?.extra || result?.Extra || {};
  return extra && typeof extra === "object" ? extra : {};
}

function qrLoginExtraFlag(extra, key) {
  return String(extra?.[key] || "").toLowerCase() === "true";
}

function resetQRLoginView(source) {
  const title = document.getElementById("qrLoginTitle");
  const canvas = document.getElementById("qrLoginCanvas");
  const image = document.getElementById("qrLoginImage");
  if (title) title.textContent = `${qrLoginSourceLabel(source)}扫码登录`;
  if (canvas) canvas.style.display = "none";
  if (image) {
    image.style.display = "none";
    image.removeAttribute("src");
  }
  setQRLoginLoading(true);
  setQRLoginStatus(
    source === "qq_wx" ? "请使用微信扫码登录" : "请使用对应音乐 App 扫码登录",
  );
  resetQRLoginSMSView();
}

function closeQRLoginModal() {
  clearQRLoginPoll();
  resetQRLoginSMSView();
  const modal = document.getElementById("qrLoginModal");
  if (modal) modal.style.display = "none";
}

function restartQRLogin() {
  if (!qrLoginState.source) return;
  startQRLogin(qrLoginState.source);
}

function startQRLogin(source) {
  source = String(source || "").trim();
  if (!QR_LOGIN_SOURCE_LABELS[source]) {
    showToast(
      "扫码登录不可用",
      `${source || "当前平台"}暂不支持扫码登录`,
      "warning",
    );
    return;
  }

  clearQRLoginPoll();
  qrLoginState = {
    source,
    key: "",
    baseKey: "",
    pollTimer: 0,
    pollBusy: false,
    smsBusy: false,
    sms: {
      encryptUID: "",
      verifyParams: "",
      codeSent: false,
      mode: "",
      upSMSMobile: "",
      upSMSContent: "",
    },
  };
  const modal = document.getElementById("qrLoginModal");
  if (modal) modal.style.display = "flex";
  resetQRLoginView(source);

  fetch(`${API_ROOT}/qr_login/${encodeURIComponent(source)}`, {
    method: "POST",
  })
    .then(async (response) => {
      const data = await response.json().catch(() => null);
      if (handleConfigAuthResponse(response, data)) {
        return null;
      }
      if (!response.ok || !data) {
        throw new Error((data && data.error) || "二维码创建失败");
      }
      return data;
    })
    .then((session) => {
      if (!session) return;
      qrLoginState.key = String(session.key || "");
      qrLoginState.baseKey = qrLoginState.key;
      renderQRLoginSession(session);
      setQRLoginStatus(
        source === "qq_wx"
          ? "二维码已生成，请打开微信扫码"
          : "二维码已生成，请打开 App 扫码",
      );
      const pollInterval = QR_LOGIN_POLL_INTERVAL_MS[source] || 2200;
      pollQRLogin();
      qrLoginState.pollTimer = window.setInterval(pollQRLogin, pollInterval);
    })
    .catch((error) => {
      setQRLoginLoading(false);
      setQRLoginStatus(error.message || "二维码创建失败", "error");
      showToast("二维码创建失败", error.message || "请稍后重试", "error");
    });
}

function renderQRLoginSession(session) {
  const canvas = document.getElementById("qrLoginCanvas");
  const image = document.getElementById("qrLoginImage");
  const imageURL = String(session.image_url || session.imageURL || "").trim();
  const loginURL = String(session.url || session.URL || "").trim();

  if (imageURL && image) {
    image.src = imageURL;
    image.style.display = "block";
    if (canvas) canvas.style.display = "none";
    setQRLoginLoading(false);
    return;
  }

  if (!loginURL || !canvas) {
    throw new Error("二维码内容为空");
  }

  drawQRCodeToCanvas(loginURL, canvas);
  canvas.style.display = "block";
  if (image) image.style.display = "none";
  setQRLoginLoading(false);
}

function cookieFromQRLoginResult(result) {
  const direct = String(result?.cookie || "").trim();
  if (direct) return direct;
  const cookies = result?.cookies;
  if (!cookies || typeof cookies !== "object") return "";
  return Object.keys(cookies)
    .filter(
      (key) => String(key || "").trim() && String(cookies[key] || "").trim(),
    )
    .sort()
    .map((key) => `${key}=${cookies[key]}`)
    .join("; ");
}

function handleQRLoginSuccess(result) {
  clearQRLoginPoll();
  const cookie = cookieFromQRLoginResult(result);
  const input = document.getElementById(
    `cookie-${qrLoginCookieSource(qrLoginState.source)}`,
  );
  if (input && cookie) input.value = cookie;
  setQRLoginStatus("登录成功，Cookie 已保存", "success");
  showToast(
    "扫码登录成功",
    `${qrLoginSourceLabel(qrLoginState.source)} Cookie 已保存`,
    "success",
  );
  window.setTimeout(closeQRLoginModal, 900);
}

function showSodaSMSLogin(result) {
  clearQRLoginPoll();
  const extra = qrLoginResultExtra(result);
  const upSMSMobile = String(extra.up_sms_mobile || "").trim();
  const upSMSContent = String(extra.up_sms_content || "").trim();
  const smsMode =
    qrLoginExtraFlag(extra, "need_user_sms") ||
    String(extra.sms_mode || "").toLowerCase() === "up"
      ? "up"
      : "";
  qrLoginState.sms = {
    encryptUID: String(extra.encrypt_uid || qrLoginState.sms.encryptUID || ""),
    verifyParams: String(
      extra.verify_params || qrLoginState.sms.verifyParams || "",
    ),
    codeSent:
      qrLoginExtraFlag(extra, "need_sms_code") || qrLoginState.sms.codeSent,
    mode: smsMode || qrLoginState.sms.mode || "",
    upSMSMobile: upSMSMobile || qrLoginState.sms.upSMSMobile || "",
    upSMSContent: upSMSContent || qrLoginState.sms.upSMSContent || "",
  };
  const panel = document.getElementById("qrLoginSMSPanel");
  const input = document.getElementById("qrLoginSMSCode");
  const sendBtn = document.getElementById("qrLoginSendSMSBtn");
  const validateBtn = document.getElementById("qrLoginValidateSMSBtn");
  if (panel) panel.style.display = "block";
  if (sendBtn) sendBtn.disabled = false;
  if (validateBtn) validateBtn.disabled = false;

  const mobile = String(extra.mobile || "").trim();
  if (qrLoginState.sms.mode === "up") {
    if (input) {
      input.value = "";
      input.disabled = true;
      input.style.display = "none";
    }
    if (validateBtn) validateBtn.style.display = "none";
    if (sendBtn) sendBtn.textContent = "我已发送";
    const target = qrLoginState.sms.upSMSMobile || "指定号码";
    const content = qrLoginState.sms.upSMSContent || "指定内容";
    const from = mobile ? `请使用绑定手机号 ${mobile} ` : "请使用绑定手机号 ";
    setQRLoginStatus(
      `${from}发送短信 ${content} 到 ${target}，发送后点击“我已发送”`,
      "warning",
    );
    return;
  }
  if (qrLoginState.sms.codeSent) {
    setQRLoginStatus(
      mobile
        ? `验证码已发送至 ${mobile}，请输入后确认`
        : "验证码已发送，请输入后确认",
      "warning",
    );
    if (input) input.focus();
    return;
  }

  setQRLoginStatus(
    mobile
      ? `扫码成功，请点击发送验证码到 ${mobile}`
      : "扫码成功，请点击发送验证码",
    "warning",
  );
}

function sodaSMSActionKey(action, code = "") {
  const token = String(qrLoginState.baseKey || qrLoginState.key || "").trim();
  const encryptUID = String(qrLoginState.sms.encryptUID || "").trim();
  const verifyParams = String(qrLoginState.sms.verifyParams || "").trim();
  if (!token || !encryptUID) return "";
  const parts = [token, action, encryptUID, verifyParams];
  if (action === "validate") parts.push(code);
  return parts.join("|");
}

function fetchQRLoginCheck(source, key) {
  return fetch(
    `${API_ROOT}/qr_login/${encodeURIComponent(source)}?key=${encodeURIComponent(key)}`,
  ).then(async (response) => {
    const data = await response.json().catch(() => null);
    if (handleConfigAuthResponse(response, data)) {
      return null;
    }
    if (!response.ok || !data) {
      throw new Error((data && data.error) || "登录状态检查失败");
    }
    return data;
  });
}

function sendSodaSMSCode() {
  if (qrLoginState.source !== "soda" || qrLoginState.smsBusy) return;
  const isUpSMS = qrLoginState.sms.mode === "up";
  const key = sodaSMSActionKey(isUpSMS ? "up_sms" : "send_code");
  if (!key) {
    setQRLoginStatus("缺少短信验证参数，请刷新二维码重试", "error");
    return;
  }

  qrLoginState.smsBusy = true;
  const sendBtn = document.getElementById("qrLoginSendSMSBtn");
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = isUpSMS ? "确认中..." : "发送中...";
  }
  setQRLoginStatus(isUpSMS ? "正在确认上行短信..." : "正在发送验证码...");

  fetchQRLoginCheck("soda", key)
    .then((result) => {
      if (!result) return;
      const status = String(result.status || "");
      if (status === "success") {
        handleQRLoginSuccess(result);
        return;
      }
      if (status === "failed") {
        setQRLoginStatus(
          String(result.message || "").trim() ||
            (isUpSMS ? "上行短信确认失败" : "验证码发送失败"),
          "error",
        );
        return;
      }
      showSodaSMSLogin(result);
    })
    .catch((error) => {
      setQRLoginStatus(
        error.message || (isUpSMS ? "上行短信确认失败" : "验证码发送失败"),
        "error",
      );
    })
    .finally(() => {
      qrLoginState.smsBusy = false;
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = isUpSMS ? "我已发送" : "重新发送";
      }
    });
}

function validateSodaSMSCode() {
  if (qrLoginState.source !== "soda" || qrLoginState.smsBusy) return;
  const input = document.getElementById("qrLoginSMSCode");
  const code = String(input?.value || "").trim();
  if (!code) {
    setQRLoginStatus("请输入验证码", "warning");
    if (input) input.focus();
    return;
  }
  const key = sodaSMSActionKey("validate", code);
  if (!key) {
    setQRLoginStatus("缺少短信验证参数，请刷新二维码重试", "error");
    return;
  }

  qrLoginState.smsBusy = true;
  const validateBtn = document.getElementById("qrLoginValidateSMSBtn");
  if (validateBtn) {
    validateBtn.disabled = true;
    validateBtn.textContent = "验证中...";
  }
  setQRLoginStatus("正在验证...");

  fetchQRLoginCheck("soda", key)
    .then((result) => {
      if (!result) return;
      const status = String(result.status || "");
      if (status === "success") {
        handleQRLoginSuccess(result);
        return;
      }
      setQRLoginStatus(
        String(result.message || "").trim() || "验证码错误，请重试",
        status === "failed" ? "error" : "warning",
      );
    })
    .catch((error) => {
      setQRLoginStatus(error.message || "验证码验证失败", "error");
    })
    .finally(() => {
      qrLoginState.smsBusy = false;
      if (validateBtn) {
        validateBtn.disabled = false;
        validateBtn.textContent = "确认登录";
      }
    });
}

function pollQRLogin() {
  if (!qrLoginState.source || !qrLoginState.key || qrLoginState.pollBusy)
    return;
  qrLoginState.pollBusy = true;

  fetchQRLoginCheck(qrLoginState.source, qrLoginState.key)
    .then((result) => {
      if (!result) return;
      const status = String(result.status || "");
      const message = String(result.message || "").trim();
      if (status === "success") {
        handleQRLoginSuccess(result);
        return;
      }
      if (status === "scanned") {
        const extra = qrLoginResultExtra(result);
        if (
          qrLoginState.source === "soda" &&
          qrLoginExtraFlag(extra, "need_sms")
        ) {
          showSodaSMSLogin(result);
          return;
        }
        setQRLoginStatus(message || "已扫码，请在手机上确认", "warning");
        return;
      }
      if (status === "waiting") {
        setQRLoginStatus(message || "等待扫码中");
        return;
      }
      if (status === "expired") {
        clearQRLoginPoll();
        setQRLoginStatus(message || "二维码已过期，请刷新", "warning");
        return;
      }
      clearQRLoginPoll();
      setQRLoginStatus(message || "登录失败，请刷新重试", "error");
    })
    .catch((error) => {
      clearQRLoginPoll();
      setQRLoginStatus(error.message || "登录状态检查失败", "error");
    })
    .finally(() => {
      qrLoginState.pollBusy = false;
    });
}

function qrUtf8Bytes(text) {
  if (window.TextEncoder) {
    return Array.from(new TextEncoder().encode(text));
  }
  return Array.from(unescape(encodeURIComponent(text)), (ch) =>
    ch.charCodeAt(0),
  );
}

function qrAppendBits(bits, value, length) {
  for (let i = length - 1; i >= 0; i--) {
    bits.push(((value >>> i) & 1) !== 0);
  }
}

const QR_VERSION_SPECS = [
  null,
  { data: 19, ecc: 7, blocks: 1, align: [] },
  { data: 34, ecc: 10, blocks: 1, align: [6, 18] },
  { data: 55, ecc: 15, blocks: 1, align: [6, 22] },
  { data: 80, ecc: 20, blocks: 1, align: [6, 26] },
  { data: 108, ecc: 26, blocks: 1, align: [6, 30] },
  { data: 136, ecc: 18, blocks: 2, align: [6, 34] },
];

function qrPickVersion(byteLength) {
  for (let version = 1; version < QR_VERSION_SPECS.length; version++) {
    if (
      byteLength <= Math.floor((QR_VERSION_SPECS[version].data * 8 - 12) / 8)
    ) {
      return version;
    }
  }
  throw new Error("二维码内容过长，请刷新重试");
}

function qrGfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = ((z << 1) ^ ((z >>> 7) * 0x11d)) & 0xff;
    if (((y >>> i) & 1) !== 0) z ^= x;
  }
  return z;
}

function qrRsGenerator(degree) {
  const result = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = qrGfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = qrGfMul(root, 2);
  }
  return result;
}

function qrRsRemainder(data, generator) {
  const result = new Array(generator.length).fill(0);
  data.forEach((value) => {
    const factor = value ^ result.shift();
    result.push(0);
    for (let i = 0; i < result.length; i++) {
      result[i] ^= qrGfMul(generator[i], factor);
    }
  });
  return result;
}

function qrCodewords(text) {
  const bytes = qrUtf8Bytes(text);
  const version = qrPickVersion(bytes.length);
  const spec = QR_VERSION_SPECS[version];
  const bits = [];
  qrAppendBits(bits, 0x4, 4);
  qrAppendBits(bits, bytes.length, 8);
  bytes.forEach((value) => qrAppendBits(bits, value, 8));
  const maxBits = spec.data * 8;
  if (bits.length > maxBits) throw new Error("二维码内容过长");
  for (let i = 0, n = Math.min(4, maxBits - bits.length); i < n; i++)
    bits.push(false);
  while (bits.length % 8 !== 0) bits.push(false);

  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j++) value = (value << 1) | (bits[i + j] ? 1 : 0);
    data.push(value);
  }
  for (let pad = 0xec; data.length < spec.data; pad ^= 0xfd) {
    data.push(pad);
  }

  const generator = qrRsGenerator(spec.ecc);
  const blockLen = spec.data / spec.blocks;
  const blocks = [];
  for (let i = 0; i < spec.blocks; i++) {
    const block = data.slice(i * blockLen, (i + 1) * blockLen);
    blocks.push({ data: block, ecc: qrRsRemainder(block, generator) });
  }

  const result = [];
  for (let i = 0; i < blockLen; i++) {
    blocks.forEach((block) => result.push(block.data[i]));
  }
  for (let i = 0; i < spec.ecc; i++) {
    blocks.forEach((block) => result.push(block.ecc[i]));
  }
  return { version, codewords: result };
}

function qrSetModule(qr, x, y, dark, fixed = false) {
  if (x < 0 || y < 0 || x >= qr.size || y >= qr.size) return;
  qr.modules[y][x] = !!dark;
  if (fixed) qr.fixed[y][x] = true;
}

function qrAddFinder(qr, cx, cy) {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      qrSetModule(qr, cx + dx, cy + dy, dist !== 2 && dist !== 4, true);
    }
  }
}

function qrAddAlignment(qr, cx, cy) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      qrSetModule(qr, cx + dx, cy + dy, dist === 0 || dist === 2, true);
    }
  }
}

function qrFormatBits(mask) {
  const data = (1 << 3) | mask;
  let bits = data << 10;
  for (let i = 14; i >= 10; i--) {
    if (((bits >>> i) & 1) !== 0) bits ^= 0x537 << (i - 10);
  }
  return ((data << 10) | (bits & 0x3ff)) ^ 0x5412;
}

function qrPlaceFormat(qr, mask) {
  const bits = qrFormatBits(mask);
  const n = qr.size;
  for (let i = 0; i <= 5; i++)
    qrSetModule(qr, 8, i, ((bits >>> i) & 1) !== 0, true);
  qrSetModule(qr, 8, 7, ((bits >>> 6) & 1) !== 0, true);
  qrSetModule(qr, 8, 8, ((bits >>> 7) & 1) !== 0, true);
  qrSetModule(qr, 7, 8, ((bits >>> 8) & 1) !== 0, true);
  for (let i = 9; i < 15; i++)
    qrSetModule(qr, 14 - i, 8, ((bits >>> i) & 1) !== 0, true);
  for (let i = 0; i < 8; i++)
    qrSetModule(qr, n - 1 - i, 8, ((bits >>> i) & 1) !== 0, true);
  for (let i = 8; i < 15; i++)
    qrSetModule(qr, 8, n - 15 + i, ((bits >>> i) & 1) !== 0, true);
  qrSetModule(qr, 8, n - 8, true, true);
}

function qrBuildMatrix(text) {
  const { version, codewords } = qrCodewords(text);
  const size = 17 + version * 4;
  const qr = {
    size,
    modules: Array.from({ length: size }, () => new Array(size).fill(false)),
    fixed: Array.from({ length: size }, () => new Array(size).fill(false)),
  };
  qrAddFinder(qr, 3, 3);
  qrAddFinder(qr, size - 4, 3);
  qrAddFinder(qr, 3, size - 4);
  for (let i = 8; i < size - 8; i++) {
    qrSetModule(qr, i, 6, i % 2 === 0, true);
    qrSetModule(qr, 6, i, i % 2 === 0, true);
  }
  QR_VERSION_SPECS[version].align.forEach((cy) => {
    QR_VERSION_SPECS[version].align.forEach((cx) => {
      if (!qr.fixed[cy][cx]) qrAddAlignment(qr, cx, cy);
    });
  });
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      qrSetModule(qr, 8, i, false, true);
      qrSetModule(qr, i, 8, false, true);
    }
  }
  for (let i = 0; i < 8; i++) qrSetModule(qr, size - 1 - i, 8, false, true);
  for (let i = 0; i < 7; i++) qrSetModule(qr, 8, size - 1 - i, false, true);
  qrSetModule(qr, 8, size - 8, true, true);

  const bits = [];
  codewords.forEach((value) => qrAppendBits(bits, value, 8));
  let bitIndex = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right--;
    for (let vert = 0; vert < size; vert++) {
      const y = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        if (qr.fixed[y][x]) continue;
        let dark = bitIndex < bits.length ? bits[bitIndex] : false;
        bitIndex++;
        if ((x + y) % 2 === 0) dark = !dark;
        qrSetModule(qr, x, y, dark, false);
      }
    }
    upward = !upward;
  }
  qrPlaceFormat(qr, 0);
  return qr;
}

function drawQRCodeToCanvas(text, canvas) {
  const qr = qrBuildMatrix(text);
  const logicalSize = 260;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = logicalSize * dpr;
  canvas.height = logicalSize * dpr;
  canvas.style.width = `${logicalSize}px`;
  canvas.style.height = `${logicalSize}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, logicalSize, logicalSize);
  const border = 4;
  const scale = Math.max(1, Math.floor(logicalSize / (qr.size + border * 2)));
  const offset =
    Math.floor((logicalSize - (qr.size + border * 2) * scale) / 2) +
    border * scale;
  ctx.fillStyle = "#0f172a";
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.modules[y][x])
        ctx.fillRect(offset + x * scale, offset + y * scale, scale, scale);
    }
  }
}

// ==========================================
// 下载记录
// ==========================================

let downloadQueuePage = 1;
let downloadQueueLoading = false;
let downloadQueueLastPoll = 0;
let downloadQueueRenderKey = "";
let downloadQueueFilter = "";
let downloadQueuePaused = false;
let downloadQueuePauseReason = "";
let downloadQueueActiveCount = 0;
let downloadManagerTab = "queue";

function createDownloadRequestID() {
  const cryptoAPI = globalThis.crypto;
  if (typeof cryptoAPI?.randomUUID === "function") return cryptoAPI.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof cryptoAPI?.getRandomValues === "function") {
    cryptoAPI.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function enqueueDownloadURLs(urls) {
  const songs = urls.map(raw => {
    const params = new URL(raw, window.location.href).searchParams;
    return Object.fromEntries(["id", "source", "name", "artist", "album", "cover", "extra"].map(key => [key, params.get(key) || ""]).concat([["embed", params.get("embed") === "1"]]));
  });
  const response = await fetch(`${API_ROOT}/api/downloads/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify({ request_id: createDownloadRequestID(), songs }),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || "加入队列失败");
  void loadDownloadQueue();
  return data;
}

async function switchDownloadManagerTab(tab) {
  downloadManagerTab = tab;
  document.getElementById("download-queue-panel").hidden = tab !== "queue";
  document.getElementById("download-history-panel").hidden = tab !== "history";
  document.getElementById("download-dedup-panel").hidden = tab !== "dedup";
  document.querySelectorAll("[data-download-tab]").forEach(button => {
    button.setAttribute("aria-selected", String(button.dataset.downloadTab === tab));
  });
  if (tab === "queue") await loadDownloadQueue();
  else if (tab === "dedup") await loadDownloadDedupPage(1);
  else await loadDownloadRecordsPage(1);
}

let activeDownloadDedupPage = 1;
let downloadDedupSearchTimer = 0;

function scheduleDownloadDedupSearch() {
  clearTimeout(downloadDedupSearchTimer);
  downloadDedupSearchTimer = setTimeout(() => loadDownloadDedupPage(1), 300);
}

async function loadDownloadDedupPage(page = 1) {
  const countEl = document.getElementById("download-dedup-count");
  const listEl = document.getElementById("download-dedup-list");
  const paginationEl = document.getElementById("download-dedup-pagination");
  const q = document.getElementById("download-dedup-search")?.value?.trim() || "";
  if (countEl) countEl.textContent = "加载中...";
  try {
    const params = new URLSearchParams({page: String(Math.max(1, parsePositiveInt(page, 1))), q});
    const resp = await fetch(`${API_ROOT}/api/downloads/dedup?${params}`, {cache: "no-store"});
    const data = await resp.json();
    if (!resp.ok || data.error) throw new Error(data.error || `HTTP ${resp.status}`);
    const items = data.items || [];
    activeDownloadDedupPage = Math.max(1, parsePositiveInt(data.page, 1));
    const totalPages = Math.max(1, parsePositiveInt(data.total_pages, 1));
    if (countEl) countEl.textContent = `共 ${parsePositiveInt(data.total, 0)} 条${q ? "（已筛选）" : ""}`;
    if (listEl) {
      listEl.innerHTML = items.map(item => {
        const file = item.file_exists === false
          ? '<span class="download-record-status is-skipped"><i class="fa-solid fa-folder-minus"></i>文件已移走</span>'
          : item.file_exists === true
            ? '<span class="download-record-status is-success"><i class="fa-solid fa-check"></i>文件在本地</span>'
            : '<span class="download-record-status"><i class="fa-regular fa-circle-question"></i>路径未知</span>';
        const time = item.created_at ? new Date(item.created_at).toLocaleString() : "";
        return `<article class="queue-task"><div class="queue-task-main"><strong>${escapeHtml(item.name || "未知歌曲")}</strong><span>${escapeHtml(item.artist || "未知歌手")}${time ? " · " + escapeHtml(time) : ""}</span><small>${escapeHtml(item.rel_path || "")}</small></div><div class="queue-task-action">${file}<div class="queue-task-buttons"><button type="button" class="queue-delete-button" onclick="removeDownloadDedup(${escapeHtml(JSON.stringify(item.key))})" title="删除记录，允许重新下载" aria-label="删除已下载记录：${escapeHtml(item.name || "未知歌曲")}"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button></div></div></article>`;
      }).join("") || '<div class="download-records-empty"><div><i class="fa-regular fa-clock"></i><br>暂无已下载记录</div></div>';
    }
    if (paginationEl) paginationEl.innerHTML = renderUtilityModalPagination(activeDownloadDedupPage, totalPages, "loadDownloadDedupPage");
  } catch (err) {
    if (countEl) countEl.textContent = "加载失败";
    if (listEl) listEl.innerHTML = `<div class="download-records-error">加载失败: ${escapeHtml(err.message)}</div>`;
  }
}

async function deleteDownloadDedup(body) {
  const resp = await fetch(`${API_ROOT}/api/downloads/dedup`, {method: "DELETE", headers: {"Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest"}, body: JSON.stringify(body)});
  const data = await resp.json();
  if (!resp.ok || data.error) throw new Error(data.error || `HTTP ${resp.status}`);
}

async function removeDownloadDedup(key) {
  try {
    await deleteDownloadDedup({keys: [key]});
    await loadDownloadDedupPage(activeDownloadDedupPage);
  } catch (err) { showToast("删除失败", err.message, "error", downloadNoticeDuration()); }
}

async function clearDownloadDedup() {
  if (!(await confirmAppAction({title: "清空已下载记录", message: "清空后所有歌曲都会被视为未下载，再次下载时会重新下载并可能覆盖本地文件。确定继续？", confirmLabel: "清空记录", destructive: true}))) return;
  try {
    await deleteDownloadDedup({all: true});
    await loadDownloadDedupPage(1);
  } catch (err) { showToast("清空失败", err.message, "error", downloadNoticeDuration()); }
}

function updateDownloadQueuePauseUI(pause) {
  const state = pause || {};
  const paused = !!state.paused;
  const wasPaused = downloadQueuePaused;
  downloadQueuePaused = paused;
  downloadQueuePauseReason = state.reason || "";
  const toggle = document.getElementById("download-queue-pause-toggle");
  if (toggle) {
    toggle.innerHTML = paused
      ? '<i class="fa-solid fa-play" aria-hidden="true"></i> 继续下载'
      : '<i class="fa-solid fa-pause" aria-hidden="true"></i> 暂停全部';
    toggle.classList.toggle("queue-resume", paused);
  }
  const banner = document.getElementById("download-queue-pause-banner");
  if (banner) {
    if (paused) {
      banner.hidden = false;
      banner.textContent = state.message || "下载已暂停。";
      banner.classList.toggle("queue-pause-banner-auth", state.reason === "auth");
    } else {
      banner.hidden = true;
      banner.textContent = "";
    }
  }
  // Surface an auto-pause even when the panel is closed: the poller keeps running.
  if (paused && !wasPaused && state.reason === "auth") {
    showToast("下载已自动暂停", state.message || "登录凭据已失效。", "error", 8000);
  }
}

async function toggleDownloadQueuePause() {
  const resume = downloadQueuePaused;
  try {
    const response = await fetch(`${API_ROOT}/api/downloads/${resume ? "resume" : "pause"}`, {method:"POST", headers:{"X-Requested-With":"XMLHttpRequest"}});
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "操作失败");
    updateDownloadQueuePauseUI(data.pause);
    await loadDownloadQueue();
  } catch (error) { showToast("队列操作失败", error.message, "error", downloadNoticeDuration()); }
}

async function loadDownloadQueue(page = downloadQueuePage) {
  if (downloadQueueLoading) return;
  downloadQueueLoading = true;
  downloadQueueLastPoll = Date.now();
  const list = document.getElementById("download-queue-list");
  const summary = document.getElementById("download-queue-summary");
  try {
    const params = new URLSearchParams({page: String(page), status: downloadQueueFilter});
    const response = await fetch(`${API_ROOT}/api/downloads/queue?${params}`, {cache:"no-store"});
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "读取队列失败");
    downloadQueuePage = data.page;
    const c = data.counts || {};
    const active = (c.waiting || 0) + (c.downloading || 0);
    downloadQueueActiveCount = active;
    const finished = (c.success || 0) + (c.skipped || 0) + (c.failed || 0) + (c.canceled || 0);
    const total = active + finished;
    setDownloadRecordsButtonState(active ? "downloading" : "idle");
    updateDownloadQueuePauseUI(data.pause);
    const badge = document.getElementById("download-queue-badge");
    if (badge) { badge.textContent = active > 999 ? "999+" : active; badge.hidden = !active; }
    if (summary) summary.innerHTML = `<div class="queue-overview"><strong>${finished}<small> / ${total} 已处理</small></strong><span>下载中 ${c.downloading || 0} · 等待 ${c.waiting || 0}</span></div><progress max="${total || 1}" value="${finished}" aria-label="队列总体进度"></progress><div class="queue-outcomes">成功 ${c.success || 0} · 跳过 ${c.skipped || 0} · 失败 ${c.failed || 0} · 已取消 ${c.canceled || 0}</div>`;
    const renderKey = JSON.stringify([data.page, downloadQueueFilter, data.tasks]);
    if (list && renderKey !== downloadQueueRenderKey) {
      downloadQueueRenderKey = renderKey;
      const labels = {waiting:"等待下载", downloading:"正在下载", success:"下载成功", skipped:"已下载，跳过", failed:"下载失败", canceled:"已取消"};
      list.innerHTML = (data.tasks || []).map(task => {
        const action = task.Status === "waiting" ? `<button type="button" class="btn-pill queue-secondary-action" onclick="downloadQueueAction(${task.ID},'cancel')">取消</button>` : ["failed","canceled"].includes(task.Status) ? `<button type="button" class="btn-pill queue-secondary-action" onclick="downloadQueueAction(${task.ID},'retry')">重试</button>` : "";
        return `<article class="queue-task"><div class="queue-task-main"><strong>${escapeHtml(task.Name || "未知歌曲")}</strong><span>${escapeHtml(task.Artist || "未知歌手")} · ${escapeHtml(task.Source)}</span><small>${escapeHtml(task.Error || task.Warning || task.Path || task.Directory || "")}</small></div><div class="queue-task-action"><span class="queue-status queue-status-${escapeHtml(task.Status)}">${labels[task.Status] || "未知状态"}</span><div class="queue-task-buttons">${action}<button type="button" class="queue-delete-button" onclick="removeDownloadQueueTask(${task.ID})" title="删除任务" aria-label="删除任务：${escapeHtml(task.Name || "未知歌曲")}"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button></div></div></article>`;
      }).join("") || '<div class="download-records-empty">暂无任务。选择歌曲后点击“批量下载”即可加入队列。</div>';
    }
    const pagination = document.getElementById("download-queue-pagination");
    if (pagination) pagination.innerHTML = renderUtilityModalPagination(data.page, Math.max(1,data.total_pages), "loadDownloadQueue");
    // Status changes may empty the last page of a filter. Move back on the next poll.
    if (data.page > Math.max(1,data.total_pages)) downloadQueuePage = Math.max(1,data.total_pages);
    const error = document.getElementById("download-queue-error");
    if (error) error.textContent = "";
  } catch (error) {
    const el = document.getElementById("download-queue-error");
    if (el) el.textContent = `队列暂不可读取：${error.message}。将自动重试，已保存任务不会被清空。`;
  } finally {
    downloadQueueLoading = false;
  }
}

async function downloadQueueAction(id, action) {
  try {
    const response = await fetch(`${API_ROOT}/api/downloads/queue/${id}/${action}`, {method:"POST", headers:{"X-Requested-With":"XMLHttpRequest"}});
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "操作失败");
    await loadDownloadQueue();
  } catch (error) { showToast("队列操作失败", error.message, "error", downloadNoticeDuration()); }
}

async function removeDownloadQueueTask(id) {
  await deleteDownloadQueue(`${API_ROOT}/api/downloads/queue/${id}`);
}

async function clearDownloadQueue() {
  if (!(await confirmAppAction({title:"清空下载队列", message:"确定清空全部任务？等待任务将停止排队；正在下载的一首会完成写入。已下载文件和下载记录会保留。", confirmLabel:"清空队列", destructive:true}))) return;
  await deleteDownloadQueue(`${API_ROOT}/api/downloads/queue`);
}

async function deleteDownloadQueue(url) {
  try {
    const response = await fetch(url, {method:"DELETE", headers:{"X-Requested-With":"XMLHttpRequest"}});
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "删除失败");
    downloadQueuePage = 1;
    downloadQueueRenderKey = "";
    await loadDownloadQueue(1);
  } catch (error) { showToast("队列操作失败", error.message, "error", downloadNoticeDuration()); }
}

window.setInterval(() => {
  if (document.hidden) return;
  const modal = document.getElementById("downloadRecordsModal");
  if (modal && modal.style.display === "flex" && downloadManagerTab === "queue") { void loadDownloadQueue(); return; }
  // When the panel is closed, only keep the background poll alive while work is
  // in flight (or paused), so the badge/progress and any auto-pause still update.
  // An idle queue stops polling entirely instead of scanning the table every 10s.
  if ((downloadQueueActiveCount > 0 || downloadQueuePaused) && Date.now() - downloadQueueLastPoll >= 10000) void loadDownloadQueue();
}, 2000);
document.addEventListener("DOMContentLoaded", () => { void loadDownloadQueue(); });

const DOWNLOAD_RECORDS_PAGE_SIZE = 20;
let activeDownloadRecordsPage = 1;
let downloadRecordsFilter = "";

function renderUtilityModalPagination(page, totalPages, onPageChange) {
  if (totalPages <= 1) return "";
  return `<button type="button" class="utility-modal-page-button" onclick="${onPageChange}(${page - 1})" ${page <= 1 ? "disabled" : ""} aria-label="上一页"><i class="fa-solid fa-chevron-left"></i></button>
    <span class="utility-modal-page-status">第 ${page} / ${totalPages} 页</span>
    <button type="button" class="utility-modal-page-button" onclick="${onPageChange}(${page + 1})" ${page >= totalPages ? "disabled" : ""} aria-label="下一页"><i class="fa-solid fa-chevron-right"></i></button>${renderPageJump(page, totalPages, onPageChange)}`;
}

async function openDownloadRecordsModal() {
  const modal = document.getElementById("downloadRecordsModal");
  if (!modal) return;
  setDownloadRecordsButtonState("idle");
  modal.style.display = "flex";

  await switchDownloadManagerTab("queue");
}

function setDownloadRecordsButtonState(state = "idle") {
  const button = document.getElementById("download-records-button");
  if (!button) return;

  const downloading = state === "downloading";
  const updated = state === "updated";
  button.classList.toggle("is-downloading", downloading);
  button.classList.toggle("has-download-updates", updated);

  const label = downloading
    ? "下载管理，队列执行中"
    : updated
      ? "下载管理，有新的下载结果"
      : "下载管理";
  button.title = label;
  button.setAttribute("aria-label", label);
}

async function refreshOpenDownloadRecords() {
  const modal = document.getElementById("downloadRecordsModal");
  if (!modal || modal.style.display !== "flex") return false;
  await loadDownloadRecordsPage(1);
  return true;
}

async function loadDownloadRecordsPage(page = 1) {
  const countEl = document.getElementById("download-records-count");
  const listEl = document.getElementById("download-records-list");
  const paginationEl = document.getElementById("download-records-pagination");
  if (countEl) countEl.textContent = "加载中...";
  if (listEl) listEl.innerHTML = "";
  if (paginationEl) paginationEl.innerHTML = "";

  const params = new URLSearchParams({
    page: String(Math.max(1, parsePositiveInt(page, 1))),
    page_size: String(DOWNLOAD_RECORDS_PAGE_SIZE),
    status: downloadRecordsFilter,
  });

  try {
    const resp = await fetch(`${API_ROOT}/api/downloads/records?${params}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const records = data.records || [];
    activeDownloadRecordsPage = Math.max(1, parsePositiveInt(data.page, 1));
    const total = Math.max(0, parsePositiveInt(data.total, 0));
    const totalPages = Math.max(1, parsePositiveInt(data.total_pages, 1));

    if (countEl) {
      const c = data.counts || {};
      countEl.textContent = `共 ${total} 条  ·  成功 ${c.success || 0}  ·  跳过 ${c.skipped || 0}  ·  失败 ${c.failed || 0}`;
    }

    if (records.length === 0) {
      if (listEl) listEl.innerHTML = '<div class="download-records-empty"><div><i class="fa-regular fa-clock"></i><br>暂无下载记录</div></div>';
      return;
    }

    let html = `<table class="download-records-table">
      <thead><tr>
        <th>歌曲</th>
        <th>歌手</th>
        <th>来源</th>
        <th>状态</th>
        <th>时间</th>
      </tr></thead><tbody>`;

    for (const r of records) {
      const status = r.Status === "success"
        ? { className: "is-success", icon: "fa-check", label: "成功" }
        : r.Status === "skipped"
          ? { className: "is-skipped", icon: "fa-forward", label: "跳过" }
          : { className: "is-failed", icon: "fa-xmark", label: "失败" };
      const reason = r.Error ? `<div class="download-record-reason">${escapeHtml(r.Error)}</div>` : "";
      const time = r.CreatedAt ? new Date(r.CreatedAt).toLocaleString() : "";
      html += `<tr>
        <td><div class="download-record-name">${escapeHtml(r.Name || "")}</div>${reason}</td>
        <td><div class="download-record-artist">${escapeHtml(r.Artist || "")}</div></td>
        <td><span class="download-record-source">${escapeHtml(r.Source || "")}</span></td>
        <td><span class="download-record-status ${status.className}"><i class="fa-solid ${status.icon}"></i>${status.label}</span></td>
        <td class="download-record-time">${escapeHtml(time)}</td>
      </tr>`;
    }

    html += "</tbody></table>";
    if (listEl) listEl.innerHTML = html;
    if (paginationEl) {
      paginationEl.innerHTML = renderUtilityModalPagination(
        activeDownloadRecordsPage,
        totalPages,
        "loadDownloadRecordsPage",
      );
    }
  } catch (err) {
    if (countEl) countEl.textContent = "加载失败";
    if (listEl) listEl.innerHTML = `<div class="download-records-error">加载失败: ${escapeHtml(err.message)}</div>`;
  }
}

async function retryFailedDownloadRecords() {
  try {
    const resp = await fetch(`${API_ROOT}/api/downloads/records/retry-failed`, {method:"POST", headers:{"X-Requested-With":"XMLHttpRequest"}});
    const data = await resp.json();
    if (!resp.ok || data.error) throw new Error(data.error || `HTTP ${resp.status}`);
    if (!data.total) {
      showToast("没有可重试的失败项", "失败记录已重新下载，或缺少重试所需的歌曲信息。", "info", downloadNoticeDuration());
      return;
    }
    showToast("已加入下载队列", `${data.added} 首失败歌曲重新排队${data.total > data.added ? `，${data.total - data.added} 首已在队列中` : ""}。`, "success", downloadNoticeDuration());
    downloadQueueRenderKey = "";
    await switchDownloadManagerTab("queue");
  } catch (err) {
    showToast("重试失败", err.message, "error", downloadNoticeDuration());
  }
}

function closeDownloadRecordsModal() {
  const modal = document.getElementById("downloadRecordsModal");
  if (modal) modal.style.display = "none";
}

async function clearDownloadRecords() {
  if (!confirm("确定清空所有下载记录？此操作不可撤销。")) return;

  try {
    const resp = await fetch(`${API_ROOT}/api/downloads/records`, { method: "DELETE" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const countEl = document.getElementById("download-records-count");
    const listEl = document.getElementById("download-records-list");
    const paginationEl = document.getElementById("download-records-pagination");
    if (countEl) countEl.textContent = "已清空";
    if (listEl) listEl.innerHTML = '<div class="download-records-empty"><div><i class="fa-regular fa-clock"></i><br>暂无下载记录</div></div>';
    if (paginationEl) paginationEl.innerHTML = "";
    activeDownloadRecordsPage = 1;
  } catch (err) {
    alert("清空失败: " + err.message);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let openDownloadDirectoryInFlight = false;

async function openDownloadDirectory() {
  if (openDownloadDirectoryInFlight) return;
  openDownloadDirectoryInFlight = true;
  const buttons = Array.from(
    document.querySelectorAll('[onclick="openDownloadDirectory()"]'),
  );
  buttons.forEach((button) => {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
  });
  showToast("正在打开下载目录", "正在请求本机打开下载文件夹", "info", 1800);
  try {
    const response = await fetch(`${API_ROOT}/open_download_dir`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: "{}",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "当前环境无法打开下载目录");
    }
    showToast(
      "已打开下载目录",
      payload.path || webSettings.downloadDir,
      "success",
      4000,
    );
  } catch (error) {
    showToast(
      "无法打开下载目录",
      String(error?.message || error),
      "error",
      6000,
    );
  } finally {
    openDownloadDirectoryInFlight = false;
    buttons.forEach((button) => {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    });
  }
}

let systemConfigLoadSequence = 0;
let systemConfigLoadController = null;

function setSystemConfigLoading(loading) {
  const modal = document.getElementById("cookieModal");
  const saveButton = document.getElementById("settings-save-button");
  if (modal) {
    modal.setAttribute("aria-busy", String(loading));
  }
  if (!saveButton) return;
  saveButton.disabled = loading;
  saveButton.setAttribute("aria-busy", String(loading));
  saveButton.textContent = loading ? "正在加载设置..." : "保存设置";
}

async function openSystemConfig(initialTab = "general") {
  const modal = document.getElementById("cookieModal");
  const requestSequence = ++systemConfigLoadSequence;
  systemConfigLoadController?.abort();
  const controller = new AbortController();
  systemConfigLoadController = controller;

  // Open from the cached settings immediately. Auto source switching can keep
  // the same-origin request slots busy, but it must not delay this dialog.
  if (modal) modal.style.display = "flex";
  bindSettingsTabs();
  setSettingsTab(initialTab);
  setSystemConfigLoading(true);

  try {
    const [cookiesResponse, settingsResponse] = await Promise.all([
      fetch(API_ROOT + "/cookies", {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }),
      fetch(API_ROOT + "/settings", { signal: controller.signal }),
    ]);
    const cookies = await cookiesResponse.json().catch(() => null);
    const settings = await settingsResponse.json().catch(() => null);
    if (requestSequence !== systemConfigLoadSequence) return;
    if (handleConfigAuthResponse(cookiesResponse, cookies)) {
      if (modal) modal.style.display = "none";
      return;
    }
    if (!cookiesResponse.ok || !settingsResponse.ok) {
      throw new Error("加载系统配置失败");
    }
    applyWebSettings(settings);
    for (const [k, v] of Object.entries(cookies || {})) {
      const el = document.getElementById(`cookie-${k}`);
      if (el) el.value = v;
    }
    bindSettingsTabs();
    setSettingsTab(initialTab);
    setAuthFloatLoggedIn(true);
  } catch (error) {
    if (
      requestSequence !== systemConfigLoadSequence ||
      error?.name === "AbortError"
    ) {
      return;
    }
    if (modal) modal.style.display = "none";
    applyWebSettings(webSettings);
    showToast("系统配置加载失败", error.message || "请稍后重试", "error");
  } finally {
    if (requestSequence === systemConfigLoadSequence) {
      systemConfigLoadController = null;
      setSystemConfigLoading(false);
    }
  }
}

function openCookieModal() {
  openSystemConfig();
}

async function saveCookies() {
  const webPageSizeInput = document.getElementById("setting-web-page-size");
  const cliPageSizeInput = document.getElementById("setting-cli-page-size");
  const previousSearchFilters = {
    filterVersionKeywords: webSettings.filterVersionKeywords,
    versionFilterKeywords: webSettings.versionFilterKeywords,
    filterShortTracks: webSettings.filterShortTracks,
  };

  const nextSettings = normalizeWebSettings({
    embedDownload: !!document.getElementById("setting-embed-download")
      ?.checked,
    downloadLyricsToLocal: !!document.getElementById(
      "setting-download-lyrics-to-local",
    )?.checked,
    downloadDir: document.getElementById("setting-download-dir")?.value || "",
    downloadFilenameTemplate:
      document.getElementById("setting-download-filename-template")?.value ||
      "",
    downloadTipDuration: parsePositiveInt(
      document.getElementById("setting-download-tip-duration")?.value,
      DEFAULT_DOWNLOAD_TIP_DURATION,
    ),
    webdavEnabled: !!document.getElementById("setting-webdav-enabled")
      ?.checked,
    webdavUrl: document.getElementById("setting-webdav-url")?.value || "",
    webdavUsername:
      document.getElementById("setting-webdav-username")?.value || "",
    webdavPassword:
      document.getElementById("setting-webdav-password")?.value || "",
    webdavDir: document.getElementById("setting-webdav-dir")?.value || "",
    webPageSize: parsePositiveInt(
      webPageSizeInput?.value,
      DEFAULT_WEB_PAGE_SIZE,
    ),
    cliPageSize: parsePositiveInt(
      cliPageSizeInput?.value,
      DEFAULT_CLI_PAGE_SIZE,
    ),
    autoSwitchInvalidSources: !!document.getElementById(
      "setting-auto-switch-invalid-sources",
    )?.checked,
    filterVersionKeywords: !!document.getElementById(
      "setting-filter-version-keywords",
    )?.checked,
    versionFilterKeywords:
      document.getElementById("setting-version-filter-keywords")?.value ||
      "Live, Remix, Demo",
    filterShortTracks: !!document.getElementById(
      "setting-filter-short-tracks",
    )?.checked,
    normalizeChineseVariants: !!document.getElementById(
      "setting-normalize-chinese-variants",
    )?.checked,
    sodaSignerUrl:
      document.getElementById("setting-soda-signer-url")?.value || "",
    sodaSignerToken:
      document.getElementById("setting-soda-signer-token")?.value || "",
    sodaClientDir:
      document.getElementById("setting-soda-client-dir")?.value || "",
  });

  const data = {};
  document.querySelectorAll('input[id^="cookie-"]').forEach((input) => {
    data[input.id.replace("cookie-", "")] = input.value;
  });

  try {
    const [cookiesResponse, settingsResponse] = await Promise.all([
      fetch(API_ROOT + "/cookies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(data),
      }),
      fetch(API_ROOT + "/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(nextSettings),
      }),
    ]);
    const cookiesPayload = await cookiesResponse.json().catch(() => null);
    const savedSettings = await settingsResponse.json().catch(() => null);
    if (
      handleConfigAuthResponse(cookiesResponse, cookiesPayload) ||
      handleConfigAuthResponse(settingsResponse, savedSettings)
    )
      return;
    if (!cookiesResponse.ok || !settingsResponse.ok) {
      throw new Error(
        savedSettings?.error || cookiesPayload?.error || "保存失败，请稍后重试",
      );
    }
    applyWebSettings(savedSettings || nextSettings);
    const filtersChanged =
      previousSearchFilters.filterVersionKeywords !==
        webSettings.filterVersionKeywords ||
      previousSearchFilters.versionFilterKeywords !==
        webSettings.versionFilterKeywords ||
      previousSearchFilters.filterShortTracks !==
        webSettings.filterShortTracks;
    if (filtersChanged && document.querySelector(".container")) {
      await refreshCurrentPageContent({ scroll: false });
    }
    setAuthFloatLoggedIn(true);
    alert("保存成功");
    document.getElementById("cookieModal").style.display = "none";
  } catch (error) {
    alert(error.message || "保存失败，请稍后重试");
  }
}

function scrollToTop() {
  window.scrollTo(0, 0);
}

// ==========================================
// 浮动翻页键
// ==========================================

function updateFloatPageNav() {
  const numEl = document.getElementById("float-page-num");
  if (!numEl) return;

  const { current } = getRenderedSearchPageInfo();
  setFloatPageNumber(numEl, current);
}

function setFloatPageNumber(element, page) {
  if (element.tagName === "INPUT") {
    element.value = String(page);
  } else {
    element.textContent = String(page);
  }
}

function getRenderedSearchPageInfo() {
  const fallback = parseInt(new URLSearchParams(window.location.search).get("page"), 10) || 1;
  const summary = document.querySelector(".page-summary");
  const match = summary ? summary.textContent.match(/(\d+)\s*\/\s*(\d+)/) : null;
  if (!match) return { current: fallback, total: null };
  return {
    current: parseInt(match[1], 10) || fallback,
    total: parseInt(match[2], 10) || null,
  };
}

function floatPageUp() {
  const { current } = getRenderedSearchPageInfo();
  if (current > 1) goToPage(current - 1);
}

function floatPageDown() {
  const { current, total } = getRenderedSearchPageInfo();
  if (total && current < total) goToPage(current + 1);
}

// 点击页数 → 输入框 → Enter/blur 跳转
function floatPageNumClick() {
  const numEl = document.getElementById("float-page-num");
  if (!numEl) return;
  if (!getRenderedSearchPageInfo().total) return;
  const currentVal = numEl.textContent.trim();
  // 如果已经是输入框则忽略
  if (numEl.tagName === "INPUT") return;

  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.value = currentVal;
  input.className = numEl.className;
  input.id = numEl.id;
  input.style.width = "40px";
  input.style.height = "28px";
  input.style.textAlign = "center";
  input.style.fontSize = "13px";
  input.style.fontWeight = "700";
  input.style.color = "#10b981";
  input.style.border = "2px solid #10b981";
  input.style.borderRadius = "6px";
  input.style.outline = "none";
  input.style.background = "white";

  let submitted = false;
  const restore = () => {
    if (input.parentNode) input.parentNode.replaceChild(numEl, input);
  };
  const jump = () => {
    if (submitted) return;
    submitted = true;
    const val = parseInt(input.value, 10);
    restore();
    if (Number.isFinite(val) && val > 0) goToPage(val);
  };

  input.onkeydown = function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      jump();
    }
    if (e.key === "Escape") {
      submitted = true;
      restore();
    }
  };
  input.onblur = jump;

  numEl.parentNode.replaceChild(input, numEl);
  input.focus();
  input.select();
}

function formatDuration(seconds) {
  const s = Number(seconds || 0);
  if (!s || s <= 0) return "-";
  const min = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function containsEastAsianChar(value) {
  return /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/.test(
    String(value || ""),
  );
}

function trimArtistToken(value) {
  return String(value || "")
    .trim()
    .replace(/^[-_·|\\/,，、；;&\s]+|[-_·|\\/,，、；;&\s]+$/g, "")
    .trim();
}

function splitArtistTokens(artist) {
  const rawArtist = String(artist || "").trim();
  if (!rawArtist) return [];

  let normalized = rawArtist.replace(
    /\s+(feat(?:uring)?\.?|ft\.?|with|x)\s+/gi,
    "|",
  );
  normalized = normalized.replace(/[、，；;]/g, "|");

  if (containsEastAsianChar(rawArtist)) {
    normalized = normalized.replace(/[\/&]/g, "|");
  } else {
    normalized = normalized.replace(/\s+(?:\/|&|\+)\s+/g, "|");
  }

  const tokens = [];
  const seen = new Set();
  normalized.split("|").forEach((item) => {
    const token = trimArtistToken(item);
    const key = token.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    tokens.push(token);
  });

  return tokens.length > 0 ? tokens : [rawArtist];
}

function buildArtistSearchURL(source, artist) {
  const params = new URLSearchParams({
    q: String(artist || ""),
    type: "song",
    exact_artist: String(artist || ""),
    sources: String(source || ""),
  });
  return `${API_ROOT}/search?${params.toString()}`;
}

function buildAlbumDetailURL(source, albumId) {
  const params = new URLSearchParams({
    id: String(albumId || ""),
    source: String(source || ""),
  });
  return `${API_ROOT}/album?${params.toString()}`;
}

function buildAlbumJumpURL(source, album, artist) {
  const params = new URLSearchParams({
    name: String(album || ""),
    artist: String(artist || ""),
    source: String(source || ""),
  });
  return `${API_ROOT}/album_jump?${params.toString()}`;
}

function getSongAlbumId(song) {
  if (song && song.album_id) return String(song.album_id);
  if (song && song.albumId) return String(song.albumId);
  if (
    song &&
    song.extra &&
    typeof song.extra === "object" &&
    song.extra.album_id
  ) {
    return String(song.extra.album_id);
  }
  return "";
}

function renderArtistLineHTML(song) {
  const artists = splitArtistTokens(song.artist || "");
  const parts = ['<i class="fa-regular fa-user artist-icon"></i>'];

  if (artists.length > 0) {
    artists.forEach((artist, index) => {
      if (index > 0) {
        parts.push('<span class="meta-separator">/</span>');
      }
      parts.push(
        `<a href="${buildArtistSearchURL(song.source, artist)}" class="meta-link artist-link">${escapeHTML(artist)}</a>`,
      );
    });
  } else {
    parts.push("<span>-</span>");
  }

  if (song.album) {
    const albumId = getSongAlbumId(song);
    parts.push('<span class="meta-separator">&middot;</span>');
    const href = albumId
      ? buildAlbumDetailURL(song.source, albumId)
      : buildAlbumJumpURL(song.source, song.album, song.artist || "");
    parts.push(
      `<a href="${href}" class="meta-link album-link">${escapeHTML(song.album)}</a>`,
    );
  }

  return parts.join("");
}

function updateCardWithSong(card, song, options = {}) {
  if (!card || !song) return;
  const shouldInspect = options.inspect !== false;
  delete card.dataset.previewOnly;

  card.dataset.id = song.id;
  card.dataset.source = song.source;
  card.dataset.albumId = getSongAlbumId(song);
  card.dataset.album = song.album || "";
  card.dataset.duration = song.duration || 0;
  card.dataset.sortDuration = String(parsePositiveInt(song.duration, 0));
  card.dataset.name = song.name || card.dataset.name;
  card.dataset.artist = song.artist || card.dataset.artist;
  card.dataset.cover = song.cover || "";
  card.dataset.extra = serializeSongExtra(song.extra);

  const titleEl = card.querySelector(".song-info h3");
  if (titleEl) {
    if (song.link) {
      titleEl.innerHTML = `<a href="${song.link}" target="_blank" class="song-title-link" title="打开原始链接">${song.name || ""}</a>`;
    } else {
      titleEl.textContent = song.name || "";
    }
  }

  const artistLine = card.querySelector(".artist-line");
  if (artistLine) {
    artistLine.innerHTML = renderArtistLineHTML(song);
  }

  const sourceTag = card.querySelector(".tag-src");
  if (sourceTag) {
    sourceTag.textContent = song.source;
  }

  const durationTag = card.querySelector(".tag-duration");
  if (durationTag) {
    durationTag.textContent = formatDuration(song.duration);
  }

  const coverWrap = card.querySelector(".cover-wrapper");
  if (coverWrap) {
    let imgEl = coverWrap.querySelector("img");
    if (!imgEl) {
      imgEl = document.createElement("img");
      coverWrap.innerHTML = "";
      coverWrap.appendChild(imgEl);
    }
    imgEl.src = song.cover || "https://via.placeholder.com/150?text=Music";
    imgEl.alt = song.name || "";
  }

  const dl = card.querySelector(".btn-download");
  if (dl) {
    dl.href = buildDownloadURL(
      song.id,
      song.source,
      song.name,
      song.artist,
      song.album || "",
      song.cover || "",
      card.dataset.extra || "",
    );
    dl.id = `dl-${song.id}`;
    dl.title = "保存到本地目录";
  }

  const browserDl = card.querySelector(".btn-browser-download");
  if (browserDl) {
    browserDl.href = buildBrowserDownloadURL(
      song.id,
      song.source,
      song.name,
      song.artist,
      song.album || "",
      song.cover || "",
      card.dataset.extra || "",
    );
    browserDl.id = `browser-dl-${song.id}`;
    browserDl.title = "浏览器下载";
  }

  const lrc = card.querySelector(".btn-lyric");
  if (lrc) {
    lrc.href = lyricURLsForSong(song).download;
    lrc.id = `lrc-${song.id}`;
  }

  const coverBtn = card.querySelector(".btn-cover");
  if (coverBtn) {
    coverBtn.href = buildCoverDownloadURL(song);
  }

  const sizeTag = card.querySelector('[id^="size-"]');
  if (sizeTag) {
    sizeTag.id = `size-${song.id}`;
    sizeTag.className = "tag tag-loading";
    sizeTag.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
  }
  const bitrateTag = card.querySelector('[id^="bitrate-"]');
  if (bitrateTag) {
    bitrateTag.id = `bitrate-${song.id}`;
    bitrateTag.className = "tag tag-loading";
    bitrateTag.innerHTML = '<i class="fa fa-circle-notch fa-spin"></i>';
  }

  if (shouldInspect) {
    queueInspectSong(card);
  }
}

function switchSource(btn, options = {}) {
  const card = btn.closest(".song-card");
  if (!card) return Promise.resolve(false);

  const ds = card.dataset;
  const name = ds.name || "";
  const artist = ds.artist || "";
  const source = ds.source || "";
  if (!name || !source) return Promise.resolve(false);

  btn.disabled = true;
  btn.style.opacity = "0.6";

  const duration = ds.duration || "";
  const url = `${API_ROOT}/switch_source?name=${encodeURIComponent(name)}&artist=${encodeURIComponent(artist)}&source=${encodeURIComponent(source)}&duration=${encodeURIComponent(duration)}`;
  return fetch(url)
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((song) => {
      updateCardWithSong(card, song);
      clearSongCardSelection(card, { deferToolbar: !!options.deferToolbar });
      return true;
    })
    .catch(() => {
      if (!options.silent) {
        alert("换源失败，请稍后重试");
      }
      return false;
    })
    .finally(() => {
      btn.disabled = false;
      btn.style.opacity = "1";
    });
}

let isBatchMode = false;
let autoSwitchInvalidTimer = 0;
let autoSwitchInvalidInProgress = false;
let autoSwitchInvalidPending = false;
let autoSwitchInvalidLastKey = "";

function clearAutoSwitchInvalidTimer() {
  if (autoSwitchInvalidTimer) {
    window.clearTimeout(autoSwitchInvalidTimer);
    autoSwitchInvalidTimer = 0;
  }
  autoSwitchInvalidPending = false;
}

function resetAutoSwitchInvalidState() {
  clearAutoSwitchInvalidTimer();
  autoSwitchInvalidInProgress = false;
  autoSwitchInvalidLastKey = "";
}

function isAutoSwitchInvalidSourcesEnabled() {
  return webSettings.autoSwitchInvalidSources === true;
}

function getInvalidSongCards(root = document) {
  const seen = new Set();
  const cards = [];
  root.querySelectorAll(".song-card").forEach((card) => {
    const hasInvalidTag = !!card.querySelector(".tag-fail");
    const hasRetryableInspection =
      card.dataset.autoSwitchRetryable === "1";
    if (
      (!hasInvalidTag && !hasRetryableInspection) ||
      seen.has(card) ||
      card.dataset.previewOnly === "1"
    )
      return;
    if (card.dataset.autoSwitchInvalidAttempted === "1" && root === document)
      return;
    seen.add(card);
    cards.push(card);
  });
  return cards;
}

function getManualInvalidSongCards(root = document) {
  const seen = new Set();
  const cards = [];
  root.querySelectorAll(".tag-fail").forEach((tag) => {
    const card = tag.closest(".song-card");
    if (!card || seen.has(card)) return;
    seen.add(card);
    cards.push(card);
  });
  return cards;
}

function invalidSongCardsKey(cards) {
  return cards
    .map((card) => `${card.dataset.source || ""}:${card.dataset.id || ""}`)
    .sort()
    .join("|");
}

function clearSongCardSelection(card, options = {}) {
  if (!card) return false;
  const cb = card.querySelector(".song-checkbox");
  if (!cb || !cb.checked) return false;
  cb.checked = false;
  card.classList.remove("selected");
  if (!options.deferToolbar) {
    updateBatchToolbar();
  }
  return true;
}

function selectInvalidSongCards(options = {}) {
  const invalidCards = Array.isArray(options.cards)
    ? options.cards
    : getManualInvalidSongCards();
  if (invalidCards.length === 0) {
    if (!options.silent) {
      alert("当前列表中没有检测到无效歌曲");
    }
    return 0;
  }

  let changed = 0;
  const invalidSet = new Set(invalidCards);
  document.querySelectorAll(".song-checkbox").forEach((checkbox) => {
    const card = checkbox.closest(".song-card");
    const shouldCheck = invalidSet.has(card);
    if (!shouldCheck && options.clearExisting !== false) {
      if (checkbox.checked) {
        checkbox.checked = false;
        changed++;
      }
      return;
    }
    if (!shouldCheck) return;
    if (!checkbox.checked) {
      checkbox.checked = true;
      changed++;
    }
  });

  updateBatchToolbar();
  if (!options.silent && changed === 0) {
    alert("无效歌曲已全部选中");
  }
  return invalidCards.length;
}

function scheduleAutoSwitchInvalidSources(
  delay = AUTO_SWITCH_INVALID_DELAY_MS,
) {
  if (!isAutoSwitchInvalidSourcesEnabled()) return;
  if (autoSwitchInvalidInProgress) {
    autoSwitchInvalidPending = true;
    return;
  }
  if (autoSwitchInvalidTimer) return;
  autoSwitchInvalidTimer = window.setTimeout(
    () => {
      autoSwitchInvalidTimer = 0;
      autoSwitchInvalidSources();
    },
    Math.max(0, delay),
  );
}

async function autoSwitchInvalidSources() {
  if (!isAutoSwitchInvalidSourcesEnabled()) return false;
  if (autoSwitchInvalidInProgress) {
    autoSwitchInvalidPending = true;
    return false;
  }
  const invalidCards = getInvalidSongCards();
  if (invalidCards.length === 0) return false;

  const key = invalidSongCardsKey(invalidCards);
  if (key && key === autoSwitchInvalidLastKey) return false;
  autoSwitchInvalidLastKey = key;
  invalidCards.forEach((card) => {
    card.dataset.autoSwitchInvalidAttempted = "1";
  });

  selectInvalidSongCards({ silent: true, cards: invalidCards });
  autoSwitchInvalidInProgress = true;
  showToast(
    "自动换源",
    `检测到 ${invalidCards.length} 首无效歌曲，正在批量换源`,
    "info",
    3500,
  );
  try {
    await batchSwitchSource({
      skipConfirm: true,
      silent: true,
      auto: true,
      cards: invalidCards,
    });
    return true;
  } finally {
    autoSwitchInvalidInProgress = false;
    if (autoSwitchInvalidPending) {
      autoSwitchInvalidPending = false;
      scheduleAutoSwitchInvalidSources();
    }
  }
}

function toggleBatchMode() {
  isBatchMode = !isBatchMode;
  document.body.classList.toggle("batch-mode", isBatchMode);
  const btn = document.getElementById("btn-batch-toggle");
  const toolbar = document.getElementById("batch-toolbar");

  if (!btn || !toolbar) return;

  if (isBatchMode) {
    btn.innerHTML = '<i class="fa-solid fa-xmark"></i> 退出批量';
    btn.classList.add("is-active");
    btn.setAttribute("aria-pressed", "true");
    toolbar.classList.add("active");
  } else {
    btn.innerHTML = '<i class="fa-solid fa-list-check"></i> 批量操作';
    btn.classList.remove("is-active");
    btn.setAttribute("aria-pressed", "false");
    toolbar.classList.remove("active");
    document
      .querySelectorAll(".song-checkbox")
      .forEach((cb) => (cb.checked = false));
    updateBatchToolbar();
  }
}

function updateBatchToolbar() {
  const checkedBoxes = document.querySelectorAll(".song-checkbox:checked");
  const count = checkedBoxes.length;
  const selectAllCb = document.getElementById("select-all-checkbox");
  const batchSwitch = document.getElementById("btn-batch-switch");
  const batchDl = document.getElementById("btn-batch-dl");
  const batchCopy = document.getElementById("btn-batch-copy-urls");

  if (document.getElementById("selected-count")) {
    document.getElementById("selected-count").textContent = count;
  }

  const allBoxes = document.querySelectorAll(".song-checkbox");
  if (allBoxes.length > 0 && selectAllCb) {
    selectAllCb.checked = allBoxes.length === count;
  }

  if (count > 0) {
    if (batchSwitch) batchSwitch.disabled = false;
    if (batchDl) batchDl.disabled = false;
    if (batchCopy) batchCopy.disabled = false;
  } else {
    if (batchSwitch) batchSwitch.disabled = true;
    if (batchDl) batchDl.disabled = true;
    if (batchCopy) batchCopy.disabled = !document.querySelector(".song-card");
  }

  document
    .querySelectorAll(".song-card")
    .forEach((card) => card.classList.remove("selected"));
  checkedBoxes.forEach((cb) => {
    cb.closest(".song-card").classList.add("selected");
  });
}

function toggleSelectAll(mainCb) {
  const checkboxes = document.querySelectorAll(".song-checkbox");
  checkboxes.forEach((cb) => (cb.checked = mainCb.checked));
  updateBatchToolbar();
}

function selectInvalidSongs() {
  selectInvalidSongCards();
}

function getSelectedSongs() {
  const checkedBoxes = document.querySelectorAll(".song-checkbox:checked");
  const songs = [];
  checkedBoxes.forEach((cb) => {
    const card = cb.closest(".song-card");
    if (card) {
      const song = songFromCard(card);
      if (!song) return;
      songs.push({
        id: song.id,
        source: song.source,
        name: song.name,
        artist: song.artist,
        duration: song.duration,
        extra: song.extra,
        url: buildDownloadURL(
          song.id,
          song.source,
          song.name,
          song.artist,
          song.album || "",
          song.cover || "",
          song.extra || "",
        ),
        cover: song.cover,
      });
    }
  });
  return songs;
}

function toAbsoluteDownloadURL(url) {
  const value = String(url || "");
  if (!value) return value;
  if (/^https?:\/\//i.test(value) || value.startsWith("//")) return value;
  try {
    return new URL(value, window.location.href).href;
  } catch (_) {
    return value;
  }
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (_) {
      // Fall through to the legacy path for webviews without clipboard permission.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  const copied = document.execCommand && document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) {
    throw new Error("当前环境不支持剪贴板");
  }
}

async function batchCopyDownloadUrls() {
  const selectedSongs = getSelectedSongs();
  let songs = selectedSongs;
  if (songs.length === 0) {
    songs = [];
    document.querySelectorAll(".song-card").forEach((card) => {
      const song = songFromCard(card);
      if (song) songs.push(song);
    });
  }

  if (songs.length === 0) {
    showToast("没有可复制的下载地址", "当前列表没有可下载的歌曲。", "info");
    return;
  }

  const urls = songs.map((song) =>
    toAbsoluteDownloadURL(
      buildBrowserDownloadURL(
        song.id,
        song.source,
        song.name,
        song.artist,
        song.album || "",
        song.cover || "",
        song.extra || "",
      ),
    ),
  );
  const text = urls.join("\n");

  try {
    await copyTextToClipboard(text);
    const scope =
      selectedSongs.length > 0
        ? `已选 ${selectedSongs.length} 首`
        : `当前页 ${songs.length} 首`;
    showToast(
      "下载地址已复制",
      `${scope}歌曲的下载链接已写入剪贴板，可直接粘贴到 aria2。`,
      "success",
      downloadNoticeDuration(),
    );
  } catch (err) {
    showToast(
      "复制失败",
      err && err.message ? err.message : "请手动复制。",
      "warning",
    );
  }
}

function confirmBatchDownload(count) {
  return confirmAppAction({
    title: "确认批量下载",
    message: `将当前页选中的 ${count} 首歌曲加入下载队列？已有任务会继续执行，新歌曲将排队等待。`,
    confirmLabel: "开始下载",
  });
}

function confirmAppAction({title, message, confirmLabel, destructive = false}) {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    const dialog = document.createElement("dialog");
    dialog.className = "modal utility-modal batch-download-confirm";
    dialog.setAttribute("aria-labelledby", "app-confirm-title");
    dialog.setAttribute("aria-describedby", "app-confirm-message");
    dialog.innerHTML = `
      <div class="modal-header"><h3 id="app-confirm-title"></h3></div>
      <form method="dialog" class="modal-body">
        <p id="app-confirm-message"></p>
        <div class="utility-modal-footer utility-modal-actions">
          <button type="submit" class="btn-pill" value="cancel" autofocus>取消</button>
          <button type="submit" class="btn-pill ${destructive ? "btn-pill-danger" : "btn-pill-primary"}" value="confirm"></button>
        </div>
      </form>`;
    dialog.querySelector("h3").textContent = title;
    dialog.querySelector("p").textContent = message;
    dialog.querySelector('button[value="confirm"]').textContent = confirmLabel;
    dialog.addEventListener("close", () => {
      const confirmed = dialog.returnValue === "confirm";
      dialog.remove();
      if (previousFocus && previousFocus.isConnected) previousFocus.focus();
      resolve(confirmed);
    }, { once: true });
    document.body.appendChild(dialog);
    dialog.showModal();
  });
}

let batchDownloadPending = false;

async function batchDownload() {
  if (batchDownloadPending) return;
  batchDownloadPending = true;
  try {
    await runBatchDownload();
  } finally {
    batchDownloadPending = false;
  }
}

async function runBatchDownload() {
  const songs = getSelectedSongs();
  if (!songs.length) return;
  if (!(await confirmBatchDownload(songs.length))) return;
  try {
    const result = await enqueueDownloadURLs(songs.map(song => song.url));
    showToast("已加入下载队列", `新增 ${result.added} 首，队列中已存在 ${result.existing} 首。可继续翻页追加，进度请查看右侧“下载管理”。`, "success", downloadNoticeDuration());
    await openDownloadRecordsModal();
  } catch (error) {
    showToast("加入队列失败", error.message, "error", downloadNoticeDuration());
  }
}

async function batchSwitchSource(options = {}) {
  const optionCards = Array.isArray(options.cards)
    ? options.cards.filter((card) => card && card.isConnected)
    : null;
  const checkedBoxes = optionCards
    ? optionCards
        .map((card) => card.querySelector(".song-checkbox"))
        .filter(Boolean)
    : Array.from(document.querySelectorAll(".song-checkbox:checked"));
  if (checkedBoxes.length === 0) return false;

  const candidateCards =
    optionCards || checkedBoxes.map((cb) => cb.closest(".song-card"));
  const cards = candidateCards.filter(Boolean);
  if (cards.length === 0) return false;

  if (
    !options.skipConfirm &&
    !confirm(
      `准备对 ${cards.length} 首歌曲进行自动换源。\n这可能需要一些时间，请耐心等待。`,
    )
  ) {
    return false;
  }

  const batchSwitch = document.getElementById("btn-batch-switch");
  const originalHTML = batchSwitch ? batchSwitch.innerHTML : "";
  if (batchSwitch) {
    batchSwitch.disabled = true;
    batchSwitch.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> 换源中';
  }

  const concurrency = Math.min(3, cards.length);
  let nextIndex = 0;
  const runWorker = async () => {
    while (nextIndex < cards.length) {
      const card = cards[nextIndex++];
      const switchBtn = card.querySelector(".btn-switch");
      if (switchBtn) {
        await switchSource(switchBtn, {
          silent: !!options.silent,
          deferToolbar: true,
        });
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: concurrency }, runWorker));
    return true;
  } finally {
    if (batchSwitch) {
      batchSwitch.innerHTML = originalHTML;
    }
    updateBatchToolbar();
  }
}

async function downloadWholeCollection(button) {
  if (!button || button.disabled) return;
  const originalHTML = button.innerHTML;
  button.disabled = true;
  button.textContent = "正在获取完整曲目…";
  try {
    const response = await fetch(`${API_ROOT}/api/downloads/queue/container`, {
      method: "POST",
      headers: {"Content-Type":"application/json", "X-Requested-With":"XMLHttpRequest"},
      body: JSON.stringify({request_id:createDownloadRequestID(),kind:button.dataset.containerKind,id:button.dataset.containerId,source:button.dataset.containerSource || "",link:button.dataset.containerLink || "",embed:!!webSettings.embedDownload}),
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "加入队列失败");
    const skippedInvalid = Number(data.skipped_invalid) || 0;
    const skippedSongs = Array.isArray(data.skipped_songs) ? data.skipped_songs.filter(Boolean) : [];
    let skippedInvalidText = "";
    if (skippedInvalid > 0) {
      skippedInvalidText = `，跳过缺少歌曲 ID 或音源 ${skippedInvalid} 首`;
      if (skippedSongs.length > 0) {
        skippedInvalidText += `（${skippedSongs.join("、")}${skippedInvalid > skippedSongs.length ? "等" : ""}）`;
      }
    }
    const title = skippedInvalid > 0 ? "已加入下载队列（部分跳过）" : "完整曲目已加入队列";
    const type = skippedInvalid > 0 ? "warning" : "success";
    showToast(title, `共获取 ${data.total} 首，新增 ${data.added} 首，队列中已存在 ${data.existing} 首${skippedInvalidText}。`, type, downloadNoticeDuration());
    await openDownloadRecordsModal();
  } catch (error) {
    showToast("整单下载失败", error.message || "请稍后重试", "error", downloadNoticeDuration());
  } finally {
    button.disabled = false;
    button.innerHTML = originalHTML;
  }
}

async function postSearchDownload(payload) {
  const response = await fetch(`${API_ROOT}/api/downloads/queue/search`, {
    method: "POST",
    headers: {"Content-Type":"application/json", "X-Requested-With":"XMLHttpRequest"},
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || "请求失败");
  return data;
}

function searchDownloadUnit(type) {
  return type === "album" ? "张专辑" : "个歌单";
}

async function downloadAllSearchResults(button) {
  if (!button || button.disabled) return;
  const params = new URLSearchParams(window.location.search);
  const payload = {
    q: (params.get("q") || "").trim(),
    type: params.get("type") || "song",
    sources: params.getAll("sources"),
    exact_artist: params.get("exact_artist") || "",
    embed: !!webSettings.embedDownload,
  };
  if (!payload.q) {
    showToast("无法下载", "缺少搜索关键词", "error", downloadNoticeDuration());
    return;
  }
  const originalHTML = button.innerHTML;
  button.disabled = true;
  button.textContent = "正在统计全部结果…";
  try {
    const preview = await postSearchDownload({...payload, dry_run: true});
    let message;
    if (preview.type === "song") {
      if (!preview.songs) throw new Error("搜索结果中没有可下载的歌曲");
      message = `将把「${payload.q}」的全部搜索结果 ${preview.songs} 首歌曲（含所有分页）加入下载队列？`;
    } else {
      const unit = searchDownloadUnit(preview.type);
      message = `将下载「${payload.q}」搜索到的全部 ${preview.containers} ${unit}（含所有分页`;
      message += preview.tracks ? `，约 ${preview.tracks} 首歌曲）` : "）";
      message += "，每个会先获取完整曲目再加入下载队列，可能需要一些时间。确定继续？";
    }
    if (!(await confirmAppAction({title: "确认一键下载", message, confirmLabel: "开始下载"}))) return;
    button.textContent = "正在加入下载队列…";
    const data = await postSearchDownload({...payload, token: preview.token, request_id: createDownloadRequestID()});
    let detail = `共 ${data.total} 首，新增 ${data.added} 首，队列中已存在 ${data.existing} 首`;
    if (data.containers) detail = `${data.containers} ${searchDownloadUnit(data.type)}，` + detail;
    if (data.skipped_invalid) detail += `，跳过缺少 ID 或音源 ${data.skipped_invalid} 首`;
    if (data.failed_containers) {
      detail += `，${data.failed_containers} ${searchDownloadUnit(data.type)}获取曲目失败`;
      if (Array.isArray(data.failed_labels) && data.failed_labels.length) detail += `（${data.failed_labels.join("、")}${data.failed_containers > data.failed_labels.length ? "等" : ""}）`;
    }
    showToast(data.failed_containers ? "已加入下载队列（部分失败）" : "全部结果已加入下载队列", detail + "。", data.failed_containers ? "warning" : "success", downloadNoticeDuration());
    await openDownloadRecordsModal();
  } catch (error) {
    showToast("一键下载失败", error.message || "请稍后重试", "error", downloadNoticeDuration());
  } finally {
    button.disabled = false;
    button.innerHTML = originalHTML;
  }
}

