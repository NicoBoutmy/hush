# Chrome Web Store listing: Hush

Copy-paste material for the Developer Dashboard. Character limits are noted where the store enforces them.

---

## Store listing tab

**Name** (from manifest, max 75): `Hush`

> Optional: many reader extensions put the function in the name for search, e.g. `Hush – Reader View`. That only means changing `"name"` in `manifest.json`. Up to you.

**Summary** (from manifest `description`, max 132):
```
A clean, private reader view for articles. No accounts, no tracking, nothing leaves your browser.
```

**Category:** Tools (under Productivity)
**Language:** English

**Description:**
```
Hush turns a cluttered article into a calm, readable page with one click, and puts it back just as quickly.

Ads, sidebars, pop-ups, cookie banners and autoplay videos disappear. What's left is the article: its title, author, images and text, in a single centered column with generous margins and good typography.

READING, YOUR WAY
Click the Aa button to adjust the view. Changes apply instantly and are remembered for every page.
• Text size: smaller or larger
• Four themes: light, sepia, gray and dark
• Four fonts: Georgia, Charter, System and Helvetica
• Column width: narrow, medium or wide
• Line spacing: tight, normal or loose

SMALL TOUCHES
• Estimated reading time under the title
• A thin progress bar at the top shows how far along you are
• Images stay inline, sized to the column
• Press Esc to close, and you're back at the same spot on the original page
• On pages that aren't articles, Hush says so instead of showing a broken view

QUICK TO OPEN
Click the toolbar icon or press Alt+Shift+R (Option+Shift+R on Mac). You can change the shortcut in Hush's options.

ACCESSIBLE
Every control works from the keyboard, with visible focus. All four themes meet WCAG contrast guidelines.

PRIVATE BY DESIGN
• No account, no sign-in
• No analytics, tracking or ads
• No network requests: nothing you read ever leaves your browser
• Runs only when you click it, only on that tab
• Your display preferences are stored locally on your device

Free, with no paid tier. Article extraction uses Mozilla's open-source Readability library, the same engine behind Firefox Reader View.
```

**Graphic assets** (capture them as described in `store/SCREENSHOTS.md`, into `store/assets/`):
- Store icon: `icons/icon128.png` (128×128)
- Screenshots (1280×800): `screenshot-1-light.png`, `screenshot-2-controls.png`, `screenshot-3-dark.png`, `screenshot-4-sepia.png`, `screenshot-5-not-article.png`
- Small promo tile (440×280): `promo-small-440x280.png`

**Official URL / homepage:** optional, leave blank or link the project repo.
**Support URL:** optional.

---

## Privacy practices tab

**Single purpose description:**
```
Hush has one purpose: it shows the article on the current web page in a clean, distraction-free reader view, which the user can open and close from the toolbar icon or a keyboard shortcut.
```

**Permission justifications:**

`activeTab`
```
Hush needs to read the current page's article only when the user clicks the toolbar icon or presses the keyboard shortcut. activeTab grants that temporary access to that one tab, so Hush needs no broad host permissions.
```

`scripting`
```
Used to inject Hush's reader-view scripts (bundled with the extension) into the active tab when the user asks for reader view. Nothing is injected automatically or on other tabs.
```

`storage`
```
Stores the user's display preferences (text size, theme, font, column width, line spacing) locally with chrome.storage.local so they persist between pages and sessions. Nothing is synced or transmitted.
```

**Remote code:** No, I am not using remote code.
```
All JavaScript is packaged in the extension. There are no external scripts, no eval, and no network requests.
```

**Data usage:** tick **none** of the data categories (no personally identifiable information, health, financial, authentication, personal communications, location, web history, user activity or website content is collected).

Tick all three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** the store needs a public URL for `store/PRIVACY.md`, for example the file on GitHub or a GitHub Pages page. Fill in `[CONTACT EMAIL]` first.

---

## Distribution tab

- Visibility: Public
- Regions: All regions
- Pricing: Free

## Before you submit

- [ ] Fill in the contact email in `store/PRIVACY.md` and host it publicly
- [ ] Upload `dist/hush-<version>.zip` (built by `tools/package.sh`)
- [ ] Verify the developer account email (required by the store)
