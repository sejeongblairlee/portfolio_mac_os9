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

- Draggable by title bar only (pointer events, mouse + touch).
- Clicking or tapping a window brings it to front (z-index raised on focus).
- On viewport resize: recompute initial positions **only if the user has not
  manually dragged the window**. A dragged window keeps its position,
  clamped back into the safe area only when it would become inaccessible.

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

## Out of scope (do not change)

Menu bar, desktop icons, window visual style, typography, colors,
button labels, close button behavior, camera/filter logic.
