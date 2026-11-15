// Hush: options page. Shows the current shortcut and links to
// Chrome's shortcut editor (extensions can't change shortcuts themselves).
const shortcutEl = document.getElementById("shortcut");

async function showShortcut() {
  const commands = await chrome.commands.getAll();
  const cmd = commands.find((c) => c.name === "_execute_action");
  shortcutEl.textContent = cmd && cmd.shortcut ? cmd.shortcut : "Not set";
}

document.getElementById("change-shortcut").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

// Refresh when the user comes back from the shortcuts page.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) showShortcut();
});
window.addEventListener("focus", showShortcut);

showShortcut();
