# design.md — Responsive Popup Layout Rules

Source of truth for popup positioning, responsive behavior, safe area logic,
and popup depth on the desktop page (`desktop.html`).

## Breakpoints

- Mobile: `width <= 768px`
- Desktop: `width > 768px`
- Safe area: **20px** on all sides.
- Use 768px consistently everywhere — one breakpoint, JS and CSS must never
  disagree. Positions must be deterministic and stable around 768px
  (no left-right oscillation during resize).
- **Exception — Works/Film/AI Images don't use the 768px viewport breakpoint
  at all.** They're always user-resizable regardless of viewport size (see
  "Current popup types" below), so their column collapse is a **container
  query on the popup's own width** (`@container`), tuned per popup to its own
  default open size — **not** a single shared number, and **not** the 768px
  viewport breakpoint used everywhere else:
  - **Works**: `@container (max-width:768px)`. Safe to reuse 768 here because
    Works opens at `960px` by default — comfortably above the threshold, so
    it stays 2-column out of the box and only collapses once resized well
    below its default.
  - **Film / AI Images**: `@container (max-width:600px)`. These both open at
    `720px` by default — **already below 768** — so reusing 768 here made
    them collapse to 1 column immediately at their normal desktop size (a
    real regression, caught 2026-07-28). 600px keeps the 720px default
    comfortably 2-column (330px/column, the original desktop look) while
    still collapsing before the column width gets cramped near the 360px
    resize floor. **When copying this pattern to a new popup, always check
    the popup's own default width against whatever container-query number
    you pick — don't assume 768 transfers.**
  - Every other popup (CU-SeeMe, About Me, Project) keys off the real
    viewport via `@media`/`window.innerWidth` at 768px, unaffected by this.

## Popup sizing

- **Popup sizes are content-specific.** There is no global popup width —
  each popup type defines its own sizing rules.
- CU-SeeMe max width: **320px**. Never grows wider.
- CU-SeeMe video ratio: **3:2** (`aspect-ratio: 3 / 2`), always preserved —
  no distortion, no fixed video height on mobile.
- CU-SeeMe scales down below 320px when the viewport is narrow:
  `width = min(320px, viewportWidth - 40px)` (40px = left + right safe area).
  The video area scales down with the popup width. No horizontal overflow.
- Other popup types may define different max widths and content ratios.

### Current popup types

| Popup | Desktop size | Mobile (≤768px) |
|---|---|---|
| CU-SeeMe (Local/Remote) | `min(320px, 100vw-40px)` | vertical stack, centered (see below) |
| About Me | `min(320px, 100vw-40px)`, `max-height: 100vh-40px` | same as desktop (small centered card, never fullscreen) |
| Works | `min(960px, 100vw-40px)` square (width = height) initially, **user-resizable** (bottom-right handle, min 360×300, clamped to safe area) | **not fullscreen** — same resizable window; grid collapses to 1 column only when the window's own width drops to ≤768px (`@container`), resize handle stays active |
| and my film | `min(720px, 100vw-40px)` square (width = height) initially, **user-resizable**, dead-center (`top:50%/left:50%`, no offset) | **not fullscreen** — same resizable window; 2-column masonry collapses to 1 column at container width ≤**600px** (not 768 — see Breakpoints exception above), resize handle stays active |
| AI Images | `min(720px, 100vw-40px)` square (width = height) initially, **user-resizable**, **offset (+24px, +24px) from dead-center** — see below | **not fullscreen** — same resizable window; grid collapses to 1 column at container width ≤**600px** (not 768 — see Breakpoints exception above), resize handle stays active |
| Project popup (Works card click) | fixed `240px` wide, dead-center, content-hugging height, not resizable | same as desktop (small centered card, never fullscreen) |

Works/Film/AI used to switch to a fullscreen mobile layout (`width<=768px`
viewport check) with dragging/resizing disabled — removed 2026-07-28. The
viewport-only check meant a merely-narrow desktop browser window (not an
actual phone) silently lost resize with zero visual feedback, which read as
"resize is broken." Unified with Blair-tunes' player: always draggable and
resizable regardless of width; only the internal grid/masonry column count
reacts to the popup's own width via `@container` (see Breakpoints above).

### Same-size popup collision (AI Images vs and my film)

AI Images and and my film are **both exactly 720×720** — if both used pure
dead-center (`top:50%; left:50%; transform:translate(-50%,-50%)`), opening
both at once would place them at the identical screen position (only
z-index would tell them apart). Fixed by offsetting AI Images' transform to
`translate(calc(-50% + 24px), calc(-50% + 24px))` — same ±24px scale as the
CU-SeeMe stagger, just applied as a static one-window offset instead of a
symmetric pair. and my film keeps pure dead-center (it was there first).
**If a new popup is added at a size that already exists (960/720/320/240),
give it a similar deliberate offset so it doesn't silently stack on the
existing one.**

### Works/Film/AI Images window resize (desktop only)

- Bottom-right corner handle (`.works-resize-handle` / `.film-resize-handle` /
  `.ai-resize-handle` — one shared CSS rule, transparent 16×16px hit area,
  same "invisible strip" technique as Blair-tunes' `.bt-rs`), adjusts both
  width and height independently via the shared `makeCenteredWinResizable`
  helper (not locked to square after the first resize — square is only the
  *initial* size).
- Shares the same "centered transform → absolute px position" conversion as
  drag (`win.dataset.dragged`) — resizing before ever dragging still starts
  from the correct centered rect.
- `min-width: 360px`, `min-height: 300px` for all three. Max is clamped to
  the 20px safe area from the window's current top/left, same convention as
  `clampToSafeArea` below.
- Always active regardless of window width — no mobile-fullscreen disablement
  (see "Current popup types" above; removed 2026-07-28).
- Each window's `onResize` callback re-syncs its own pixel scrollbar
  (`updateWorksScrollbar` / `updateFilmScrollbar` / `updateAiScrollbar`) so
  the handle position/height stays correct as the content area resizes.
- **Image sizing inside a resizable window must use `aspect-ratio`, never a
  fixed pixel height.** Works/AI Images already did (`aspect-ratio:1/1` and
  `960/1200`). Film's 6 photos originally had fixed px heights tuned for the
  720px default width (`style="height:216px"` etc.) — converted to
  `aspect-ratio:330/216` etc. (330 = the column width at the 720px default)
  so they scale proportionally instead of having their crop composition
  drift as the window is resized.

```css
.cu-win  { width: min(320px, calc(100vw - 40px)); max-width: 320px; }
.cu-video { width: 100%; aspect-ratio: 3 / 2; overflow: hidden; }
```

## Positioning

### Desktop CU-SeeMe (width > 768px) — centered staggered pair

- Width stays 320px. Do not stretch or scale above 320px.
- Local:  `x = vw/2 - popupWidth - 24`, `y = vh/2 - popupHeight/2 - 24`
- Remote: `x = vw/2 + 24`,             `y = vh/2 - popupHeight/2 + 24`
- Clamp both into the 20px safe area. Not a rigid straight line —
  windows should feel like real movable OS popups.

### Mobile CU-SeeMe (width <= 768px) — vertical stack, centered

- Stable centered positions; windows must not jump left/right on resize.
- `popupWidth = min(320, viewportWidth - 40)`
- `centerX = (viewportWidth - popupWidth) / 2`
- Local:  `x = centerX - 8`, `y = 120`
- Remote: `x = centerX + 8`, `y = localY + localHeight + 18`
- Clamp both x values to the safe area. If the viewport is too narrow for the
  ±8px offset, reduce or remove it automatically —
  **the offset is decorative only; safe area and stability have priority.**
- Both windows remain visible within the viewport as much as possible.

## Safe area constraints

Shared helper: `clampToSafeArea(x, y, windowWidth, windowHeight, viewportWidth, viewportHeight)`

- `minX = 20`, `minY = 20`
- `maxX = viewportWidth - windowWidth - 20`
- `maxY = viewportHeight - windowHeight - 20`
- All popups must stay inside the safe area; full-screen popups are exempt.
- On mobile, title bars must always remain visible.

## Resize / drag behavior

- **Every popup is draggable by its title bar — this is shared, common
  usability across all popup types** (CU-SeeMe, About Me, Works, and my
  film), not just CU-SeeMe. Pointer events, mouse + touch.
- Clicking or tapping a window brings it to front (z-index raised on focus).
- Centered-modal popups (About/Works/Film) render at CSS-centered position
  (`top: 50%; left: 50%; transform: translate(-50%, -50%)`) until the user
  starts an actual drag. Only at drag-start does the popup convert to an
  absolute `left`/`top` (px) position and drop the transform — so an
  undragged popup always re-centers correctly for the current viewport on
  every open, while a dragged popup keeps its exact position across
  close/reopen (mirrors CU-SeeMe's `dataset.dragged` behavior below).
- On viewport resize: recompute initial positions **only if the user has not
  manually dragged the window**. A dragged window keeps its position,
  clamped back into the safe area only when it would become inaccessible.
- **No exceptions** — every popup (including Works/Film/AI Images) stays
  draggable and resizable at every width. Works/Film/AI previously lost both
  on a mobile-fullscreen switch; that was removed 2026-07-28 in favor of
  container-query column collapse only (see "Current popup types" above).

## Popup shadow / depth

- Popups feel layered above the desktop — retro OS hard pixel-style offset
  shadow (down/right). No soft neumorphic shadows, no modern card UI.
- Focused window: stronger shadow + higher z-index.

```css
/* focused */
box-shadow: 4px 4px 0 rgba(0,0,0,0.28), 8px 8px 0 rgba(0,0,0,0.08);
/* unfocused */
box-shadow: 3px 3px 0 rgba(0,0,0,0.20), 6px 6px 0 rgba(0,0,0,0.06);
```

## Pixel Scrollbar (shared component)

Figma: node `71:3350` (reusable `Slider` component, vertical/horizontal
variants). **One shared implementation** — Works, Film, and the
Blair-tunes track list (`#bt-list`) all use the exact same CSS classes and
JS sync helper. Do not fork a per-window copy.

- **Markup**: `<div class="pixel-scrollbar"><div class="pixel-scrollbar-handle" hidden></div></div>`
  — no extra "track" wrapper div needed.
- **Track**: `width: 8px`, `padding: 4px 1px` (top/bottom inset is the
  handle's travel range; left/right inset centers the 6px handle).
- **Handle**: `width: 6px`. The dot pattern is a background + mask combo,
  not a solid dashed bar: a vertical 2px-on/2px-off `background-image`
  masked by a horizontal 2px-on/2px-off `mask-image`. Because the handle is
  exactly 6px wide (2+2+2), the mask naturally splits it into two 2px dot
  columns with a 2px gap between them — matches the Figma component's 44
  individual 2×2px rectangles exactly (verified pixel-for-pixel against a
  zoomed screenshot).
- **Visibility rule**: if the scrollable content fits inside its viewport
  (`scrollHeight <= clientHeight`), the handle gets the `hidden` attribute
  and renders nothing — never show a handle when there's nothing to scroll
  (this was the bug: Blair-tunes' track-list handle used to be a static
  86px-tall decoration regardless of whether the list actually overflowed).
- **JS**: `syncPixelScrollbar(track, handle, viewportHeight, contentHeight,
  scrollTop)`, defined in `desktop.html` and exposed as
  `window.__syncPixelScrollbar` (same cross-script convention as
  `window.__bringToFront` / `window.__tigerRun`) so `blairtunes.js` can call
  it without duplicating the math. Call it on the scroll container's
  `scroll` event, on window `resize`, and once after any content re-render
  that could change `scrollHeight` (e.g. after the track list renders).
- Only the vertical orientation is implemented. Figma also defines a
  horizontal variant (`type: "horizontal"`) for a future use case that
  doesn't exist in this codebase yet — same technique, transposed.

## Typography — letter-spacing tokens

Canonical `letter-spacing` per (font family, font-size) pair, across
`desktop.html` and `src/css/blairtunes.css`. Any new element using one of
these (font, size) pairs must use the matching value below — do not
introduce a third value for a pair that already has one.

| Font | Size | letter-spacing |
|---|---|---|
| VT323 | 16px | `-1.6px` |
| VT323 | 20px | `0` (unset) |
| VT323 | 14px | `-1.4px` |
| EB Garamond | 40px | `-3.2px` (except `.about-name`, see exceptions below) |
| EB Garamond | 14px | `-1.12px` |
| Pretendard | 12px | `-0.36px` (except `.about-body`, see exceptions below) |
| Pretendard | 14px | `0` (unset) |
| Pretendard | 20px | `0` (unset) |

**Known exceptions (deliberate, from a Figma resync — not drift to fix):**
- `.about-name` (EB Garamond 40px): `-2.4px`, not the `-3.2px` token used by
  `.bt-cur-tit`. Figma node 169:1053 (2026-07-22 resync) specifies this
  value for the About Me popup specifically; Blair-tunes' title was not
  updated to match. Flag to the user before "fixing" this back to `-3.2px`
  — it may be intentional per the newer Figma frame.
- `.about-body` (Pretendard 12px): `-0.24px` + `opacity:0.8`, not the
  `-0.36px` token used by `.bt-row-txt`/`.bt-dur`/`.bt-cur-des`. Same
  source (Figma 169:1053) and same caveat.

Audited 2026-07-22: found two (font, size) pairs with inconsistent values
across the codebase and unified them to whichever value the majority of
call sites already used:
- **VT323 16px** was split `-0.8px` (3 call sites: `.dt-label`,
  `.film-caption`, `.film-text-slot`) vs `-1.6px` (7 call sites, incl. every
  popup title bar) → unified to **`-1.6px`**.
- **VT323 20px** was split `0`/unset (4 call sites) vs `-1px`
  (`.bt-embed-fallback p` only) → unified to **`0`/unset**.

Different font families are allowed different letter-spacing at the same
px size (they're different typefaces) — the rule only applies **within**
the same font family.

Audited 2026-07-22 (2): `.works-desc` (Works project description text) didn't
match Figma at all — it was `weight:400 / 14px / line-height:20px / no
letter-spacing`, but Figma specifies `Pretendard:ExtraLight / 12px /
line-height:18px / letter-spacing:-0.36px` for that text. Fixed to match —
this also folds it into the existing Pretendard 12px bucket above (same
values as `.about-body`, `.bt-row-txt`, `.bt-dur`, `.bt-cur-des`), so there's
now one consistent "small ExtraLight body copy" token instead of a one-off.

## Out of scope (do not change)

Menu bar, desktop icons, window visual style, colors, button labels,
close button behavior, camera/filter logic.
