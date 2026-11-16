// MINT: service worker.
// The toolbar icon and the keyboard shortcut (_execute_action) both arrive
// here. Each grants temporary activeTab access to the current tab only.

const READER_FILES = [
  "vendor/Readability.js",
  "src/reader/settings.js",
  "src/reader/sanitize.js",
  "src/reader/styles.js",
  "src/reader/reader.js",
];

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || tab.id === undefined) return;
  const target = { tabId: tab.id };

  try {
    const [probe] = await chrome.scripting.executeScript({
      target,
      func: () => Boolean(globalThis.__mint),
    });

    if (!probe || !probe.result) {
      await chrome.scripting.executeScript({ target, files: READER_FILES });
    }

    await chrome.scripting.executeScript({
      target,
      func: () => globalThis.__mint && globalThis.__mint.toggle(),
    });
  } catch (err) {
    // Chrome does not allow extensions on some pages (chrome://, the Web
    // Store, the built-in PDF viewer...). Show a brief badge so the click
    // isn't silently ignored.
    flashUnavailable(tab.id);
  }
});

function flashUnavailable(tabId) {
  const ignore = () => {}; // the tab may have closed in the meantime
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#6b6b6b" }).catch(ignore);
  chrome.action.setBadgeText({ tabId, text: "–" }).catch(ignore);
  chrome.action.setTitle({ tabId, title: "Reader view isn't available on this page" }).catch(ignore);
  setTimeout(() => {
    chrome.action.setBadgeText({ tabId, text: "" }).catch(ignore);
    chrome.action.setTitle({ tabId, title: "MINT: toggle reader view" }).catch(ignore);
  }, 2000);
}
