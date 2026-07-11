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
| Works | `min(960px, 100vw-40px)` square (width = height) | **fullscreen** (`100vw`/`100vh`), grid collapses to 1 column |
| and my film | `min(720px, 100vw-40px)` square (width = height) | **fullscreen** (`100vw`/`100vh`), 2-column masonry collapses to 1 column |

Works/Film fullscreen mode sits above the menu bar (`z-index: 10000 !important`,
higher than the menu bar's `9999`) so menu bar text never bleeds through the
popup on mobile.

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
- **Exception:** Works and Film switch to a fullscreen mobile layout
  (see "Current popup types" above) — there is no space to drag into, so
  dragging is disabled there specifically on mobile (`width <= 768px`).
  This is the only case where a popup is not draggable.

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

## Out of scope (do not change)

Menu bar, desktop icons, window visual style, typography, colors,
button labels, close button behavior, camera/filter logic.
