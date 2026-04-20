# Aedas Board — Design System

> A whiteboard built for architects. Familiar as Miro. Unmistakably Aedas.

---

## 1. Design Philosophy

Aedas Board adopts Miro's proven interaction model — infinite canvas, left creation toolbar, top-right collaboration bar, bottom-right navigation — so anyone who has used Miro can use it on day one. But the visual identity is drawn from the studio itself: trace paper, precise linework, careful typography, restraint.

Three guiding principles:

1. **Zero friction from Miro.** Every spatial relationship, shortcut, and workflow is 1:1 with Miro. A new hire never has to ask "where's the sticky tool?"
2. **Studio, not SaaS.** The interface should feel like it came from an architecture studio, not a B2B startup. Quiet chrome. Generous whitespace. Serif accents.
3. **Made for making.** Canvas comes first. Chrome recedes until needed. No marketing noise in the product itself.

---

## 2. Brand Foundation

### 2.1 Wordmark

The wordmark uses **Instrument Serif Italic** set lowercase, followed by a single red dot. The dot is the only permanent spot of Aedas Red in the chrome — a "drawing pin" that marks the app.

```
aedas.
```

- Never bold the wordmark
- The period is always Aedas Red, always 1.2× the x-height
- Minimum clear space = height of the wordmark
- Minimum size = 18px

### 2.2 Product name

**Aedas Board** — two words, title case. Never "AedasBoard" or "aedas board."

---

## 3. Color System

All colors are defined as CSS custom properties. The palette is warm-neutral with a single red accent. This is deliberate: architects work with samples, swatches, and material boards — the UI should not compete for their eye.

### 3.1 Canvas & surface

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#FAF8F3` | Canvas background (trace-paper warm white) |
| `--grid` | `#E8E3D8` | Dot grid on canvas |
| `--panel` | `#FFFFFF` | Floating toolbars, modals, menus |
| `--panel-soft` | `#F5F2EC` | Hover states, secondary surfaces |
| `--line` | `#E0DACB` | Dividers, borders, input outlines |

### 3.2 Text & ink

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#1a1a1a` | Primary text, active tool background, default pen |
| `--ink-soft` | `#3a3a3a` | Secondary text, icon default |
| `--muted` | `#8a8578` | Tertiary text, metadata, placeholders |

### 3.3 Accent

| Token | Hex | Use |
|---|---|---|
| `--accent` | `#D94A38` | Selection outline, primary CTA in destructive contexts, wordmark dot, active cursor color for current user |
| `--accent-soft` | `#FBEAE6` | Accent hover fills, subtle highlights |

**Rule:** Aedas Red is rare. Never use it for decoration. Its job is to signal *this is selected* or *this is you*.

### 3.4 Sticky note palette

Eight warm, slightly desaturated colors tuned to look good on trace-paper canvas:

| Name | Hex | Text color |
|---|---|---|
| Canary | `#FFF8B8` | `#1a1a1a` |
| Peach | `#FFD4A8` | `#1a1a1a` |
| Rose | `#FFB8C8` | `#1a1a1a` |
| Sky | `#B8DCFF` | `#1a1a1a` |
| Sage | `#C4E8C4` | `#1a1a1a` |
| Lilac | `#D8C4F0` | `#1a1a1a` |
| Stone | `#E8E4DC` | `#1a1a1a` |
| Ink | `#2B2B2B` | `#F5F2EC` |

### 3.5 Collaborator cursor colors

Cursors are assigned deterministically from user ID hash:

```
#D94A38  Aedas Red
#2E6FDB  Drafting Blue
#2E8B57  Site Green
#C97A1F  Clay
#7A4DB8  Violet
#1D7A7A  Teal
#B8365F  Crimson
#4A5D2F  Olive
```

### 3.6 Pen colors

Six colors on the pen/highlighter popover, ordered by frequency of use:

```
#1a1a1a  Ink (default)
#D94A38  Aedas Red
#2E6FDB  Drafting Blue
#2E8B57  Site Green
#C97A1F  Clay
#7A4DB8  Violet
```

---

## 4. Typography

Three typefaces, each with a specific job. Never mix them outside their role.

### 4.1 Instrument Serif (display)

- **Used for:** the wordmark, modal headlines, empty-state messages, studio moments
- **Voice:** editorial, confident, human
- **Rule:** always set in larger sizes (24px+). Italic is welcome for emphasis.

### 4.2 Inter (UI)

- **Used for:** every button, label, menu item, tooltip, body copy, toolbar label
- **Weights in use:** 400 (body), 500 (UI default), 600 (headings, selected states), 700 (rare)
- **Letter-spacing:** tight on headings (`-0.01em` at 16px+), normal in UI

### 4.3 JetBrains Mono (metadata)

- **Used for:** zoom percentage, timestamps, "DRAFT" / "SAVED" chips, keyboard shortcut hints, share-link URLs, color hex codes
- **Voice:** precise, technical, quiet
- **Rule:** always uppercase for status labels, always at 10-12px

### 4.4 Type scale

| Size | Usage |
|---|---|
| 56px | Empty-state display (Instrument Serif) |
| 42px | Modal headline (Instrument Serif) |
| 28px | Modal title (Instrument Serif) |
| 20px | Default text widget |
| 15px | Sticky note body, shape text |
| 14px | Button, body copy |
| 13.5px | Board name input |
| 13px | Menu item |
| 12px | Secondary UI, chips |
| 11.5px | Tooltip |
| 11px | Metadata (mono), avatar fallback |

---

## 5. Spatial System

### 5.1 Spacing scale (4px base)

```
4   8   12   16   20   24   32   48   64   80   120
```

Always use scale values. Never `padding: 7px`.

### 5.2 Corner radius

| Token | Value | Use |
|---|---|---|
| `--r-xs` | 3px | Resize handles |
| `--r-sm` | 4px | Sticky notes, small chips |
| `--r-md` | 6px | Inputs, small buttons |
| `--r-lg` | 8px | Standard buttons, share-link badge |
| `--r-xl` | 10px | Tool buttons |
| `--r-2xl` | 14px | Panels, toolbars, modals |
| `--r-full` | 999px | Avatars, comment pins, chips |

### 5.3 Shadow system

```
--shadow-sm: 0 1px 2px rgba(20,18,14,.06), 0 2px 6px rgba(20,18,14,.04);
--shadow-md: 0 4px 12px rgba(20,18,14,.08), 0 12px 32px rgba(20,18,14,.06);
--shadow-lg: 0 10px 30px rgba(20,18,14,.12), 0 30px 60px rgba(20,18,14,.08);
```

Shadows are always warm (rgba of `#14120E`, never pure black). Three levels only — don't invent new ones.

**Sticky notes** use a special paper shadow:
```
0 1px 0 rgba(0,0,0,.04),
0 2px 4px rgba(0,0,0,.08),
0 8px 16px rgba(0,0,0,.06);
```

---

## 6. Iconography

- **Library:** `lucide-react` at `strokeWidth={1.8}`, size 15-17px in toolbars
- **Never mix** stroke widths on the same surface
- **Never combine** Lucide with another icon set
- **Active state:** icon becomes white on `--ink` background, never gets a fill

---

## 7. Layout Anatomy

Aedas Board reproduces Miro's spatial arrangement exactly. From the user's point of view, nothing moves.

```
┌─────────────────────────────────────────────────────────────────┐
│  [aedas. | Board name ⋯]     [DRAFT · saved now]    [👥 🔔 Present Share] │
│                                                                 │
│  ┌──┐                                                           │
│  │⇢ │                                                           │
│  │👋│                                                           │
│  │──│                                                           │
│  │◎ │                    ·  ·  ·  ·  ·  ·  ·                   │
│  │T │                                                           │
│  │▢ │                       (infinite canvas)                   │
│  │✎ │                                                           │
│  │▨ │                                                           │
│  │──│                                                           │
│  │→ │                                                           │
│  │▭ │                                                           │
│  │💬│                                                           │
│  │▦ │                                                           │
│  │+ │                                                           │
│  └──┘                                                           │
│                                                                 │
│  ┌──┐                              ┌─────────────────────────┐  │
│  │↶↷│                              │ − 100% + ⬜ 👁 ?        │  │
│  └──┘                              └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.1 Top bar

- Floating, 14px from top and sides
- Three clusters: **left** (brand + board name + menu), **center** (status), **right** (collaborators + present + share)
- Never a full-width bar — the canvas always peeks above and below

### 7.2 Left creation toolbar

- Vertical, centered on the Y axis
- Single column of 40×40px tool buttons with 2px gaps
- Divider lines group tools into semantic sections:
  - Navigation: Select, Hand
  - Content: Sticky, Text, Shapes, Pen, Highlighter, Eraser
  - Structure: Connector, Frame, Comment, Templates, More (+)

### 7.3 Bottom-left undo/redo

- 14px from bottom-left
- Smaller (34×34px) than creation toolbar — secondary action

### 7.4 Bottom-right navigation

- 14px from bottom-right
- Zoom −, zoom %, zoom +, fit-to-screen, minimap, help

### 7.5 Contextual style bar

- Appears 78px from top, horizontally centered
- Shows only when a tool is selected that has style options (pen, highlighter) OR an item is selected
- Content changes based on selection type (sticky → color swatches; shape → fill + stroke; text → font controls)

---

## 8. Motion

Motion is fast and confident — architects don't wait.

| Situation | Duration | Easing |
|---|---|---|
| Button hover | 150ms | `ease` |
| Panel open | 180ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Modal enter | 220ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Item drag | 0ms | — (direct manipulation, never animated) |
| Live cursor position | 1200ms | `cubic-bezier(0.4, 0, 0.2, 1)` (smooth interpolation between network frames) |
| Zoom | 0ms | — (track wheel/pinch 1:1) |

**Never animate** selection state — it must feel instantaneous.
**Never use bounce** easing anywhere.

---

## 9. Board Elements — Visual Spec

### 9.1 Sticky note

- Default 220×220px at zoom 1
- 16px padding
- Font 15px / line-height 1.35 / weight 500
- Paper shadow (see §5.3)
- Selected: 2px outline in `--accent`, 4px offset
- Resize handle: 14×14px square, `--accent` fill, 2px white border, bottom-right, extends 6px outside bounds

### 9.2 Shape

- Default 180×120px
- 2px stroke, white fill by default
- Text centered, 14px weight 500
- Selected outline same as sticky (accent, 4px offset)

### 9.3 Text widget

- Minimum width 100px, grows with content
- Default 20px, weight 500, `--ink` color
- No background, no border — just text on canvas
- Selection shows accent outline only when selected (not on hover)

### 9.4 Frame

- 2px border in `#C4BDA8` (warm gray, not `--line`)
- Title above the frame in 14px weight 500 `--ink-soft`
- Frames render *under* all other elements
- Selected: border becomes `--accent`

### 9.5 Comment pin

- 36×36px circle with one sharp corner (bottom-left) — radius `999px 999px 999px 4px`
- Fill `--accent`, white icon
- Drop shadow tinted red: `0 4px 12px rgba(217, 74, 56, .4)`
- Expanded comment panel sits 44px to the right

### 9.6 Connector line

- Default 2px stroke, `--ink-soft`
- Arrowhead: 10×10px triangle
- Selected: stroke becomes `--accent`, 2.5px
- Attaches to shape/sticky sides via 4 blue dots that appear on hover

### 9.7 Pen stroke

- Round cap, round join
- Default 3px, `--ink`
- Highlighter: 16px, color with 40% opacity overlay

---

## 10. Avatars & Presence

- **Avatar:** 30×30px in top bar, 32×32px in modals, 24×24px on cursor
- Circle, 2px white border, subtle shadow
- Content: user initials (max 2 chars) in weight 600 white text
- Background = user's assigned color from §3.5
- Stacked avatars overlap by 8px (`margin-right: -8px`)
- More than 4 users: show first 3 + "+N" chip in `--panel-soft`

---

## 11. Voice & Microcopy

- **Short.** "Save" not "Save changes."
- **No exclamation marks** in default UI — only in celebratory moments (vote complete).
- **Never use "Awesome!" or "Oops!"** — studio voice, not startup voice.
- **Empty states** use serif and a bit of warmth: *"Begin with a line."* *"Drop a sticky to start."*
- **Errors** are specific and quiet: "This sticky can't be deleted — it's locked." not "Error!"
- **Keyboard shortcuts** in tooltips use mono font, 10px, 60% opacity.

---

## 12. Accessibility Baseline

- All interactive elements minimum 32×32px touch target (most are 40×40)
- Text on canvas minimum 14px
- Focus rings: 2px `--accent`, 2px offset, on all keyboard-focused elements
- Color contrast: all text ≥ 4.5:1 on its background
- Every tool has a keyboard shortcut (see §13)
- Live cursors have name labels — never identify users by color alone

---

## 13. Keyboard Shortcuts (Miro parity)

| Key | Action |
|---|---|
| `V` | Select tool |
| `H` | Hand (pan) tool |
| `N` | Sticky note |
| `T` | Text |
| `S` | Shapes |
| `P` | Pen |
| `E` | Eraser |
| `L` | Connector (line) |
| `F` | Frame |
| `C` | Comment |
| `Space` + drag | Temporary pan |
| `Cmd/Ctrl` + scroll | Zoom |
| `Cmd/Ctrl` + `Z` | Undo |
| `Cmd/Ctrl` + `Shift` + `Z` | Redo |
| `Cmd/Ctrl` + `D` | Duplicate selection |
| `Cmd/Ctrl` + `A` | Select all |
| `Cmd/Ctrl` + `G` | Group |
| `Cmd/Ctrl` + `Shift` + `G` | Ungroup |
| `Cmd/Ctrl` + `L` | Lock/unlock |
| `Cmd/Ctrl` + `F` | Find on board |
| `Cmd/Ctrl` + `/` | Command palette |
| `Delete` / `Backspace` | Delete selection |
| `1` | Zoom to 100% |
| `2` | Zoom to fit selection |
| `3` | Zoom to fit board |
| `?` | Show shortcut cheat sheet |

---

## 14. Asset Library

The design ships with these ready-to-use pieces:

- **Wordmark** — SVG, three sizes (18, 22, 32px)
- **Favicon** — 16, 32, 64, 192, 512px — single red dot on warm-white
- **Empty-state illustrations** — single-line architectural sketches (plan view, section cut, axonometric)
- **Default cursor** — standard arrow, but hand-tool cursor is a custom drafting glove glyph
- **Template thumbnails** — each 4:3, generated from a flat geometric motif + accent tint

---

## 15. Don'ts

- ❌ Never put Aedas Red on more than one element per screen region
- ❌ Never use drop shadows stronger than `--shadow-lg`
- ❌ Never mix Instrument Serif with another serif
- ❌ Never add gradients to buttons (flat surfaces only)
- ❌ Never use pure black (`#000`) — always `--ink` (`#1a1a1a`)
- ❌ Never animate selection — it must be instant
- ❌ Never put marketing copy or upsells inside the canvas workspace
- ❌ Never show confetti, emojis, or celebratory GIFs — this is a studio tool
