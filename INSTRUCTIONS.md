# Aedas Board — Implementation Instructions

> Complete specification of every feature required to achieve 1:1 functional parity with Miro. Each section describes *what* the feature does, *how* it should behave, and *what data model* backs it.

---

## Table of Contents

1. [Canvas Foundation](#1-canvas-foundation)
2. [Creation Tools](#2-creation-tools)
3. [Board Elements](#3-board-elements)
4. [Selection, Editing, Manipulation](#4-selection-editing-manipulation)
5. [Multi-user Collaboration](#5-multi-user-collaboration)
6. [Comments & Mentions](#6-comments--mentions)
7. [Tagging System](#7-tagging-system)
8. [Facilitation Tools](#8-facilitation-tools)
9. [Frames & Presentation Mode](#9-frames--presentation-mode)
10. [Templates](#10-templates)
11. [Media & Embeds](#11-media--embeds)
12. [AI Assistant](#12-ai-assistant)
13. [Navigation & Viewport](#13-navigation--viewport)
14. [Sharing & Permissions](#14-sharing--permissions)
15. [Version History](#15-version-history)
16. [Search & Command Palette](#16-search--command-palette)
17. [Notifications](#17-notifications)
18. [Integrations](#18-integrations)
19. [Mobile & Touch](#19-mobile--touch)
20. [Data Model Reference](#20-data-model-reference)

---

## 1. Canvas Foundation

### 1.1 Infinite canvas
- No fixed width/height — coordinates are unbounded integers
- Content rendered inside a single transform container: `translate(panX, panY) scale(zoom)`
- Dot grid drawn as a CSS background pattern at 24px intervals, scaled with zoom
- Grid can be toggled off via Main Menu → "Hide grid"
- Canvas background color fixed to `--bg` (warm paper). A future setting may allow solid/line/grid/blank.

### 1.2 Pan
- **Hand tool (H):** click-drag anywhere pans
- **Space + drag:** temporary pan while any tool is active
- **Middle mouse button:** pans
- **Two-finger trackpad:** pans (no modifier)
- **Right mouse button drag:** pans
- Panning updates `viewport.pan = {x, y}` in realtime. No animation.

### 1.3 Zoom
- Range: **10% – 400%**
- `Cmd/Ctrl + scroll`: zoom toward cursor position
- `Cmd/Ctrl + +` / `Cmd/Ctrl + -`: zoom step ±10%
- Pinch on trackpad: zoom toward cursor
- Zoom anchor math: translate pan so the world point under the cursor stays under the cursor after zoom change
- Displayed as integer percentage in bottom-right
- `1` key jumps to 100%, `2` zooms to fit selection, `3` zooms to fit all content

### 1.4 Fit to content
- Calculates bounding box of all items + strokes
- Adds 10% padding
- Sets zoom and pan so bbox fits viewport

---

## 2. Creation Tools

Every tool below is reachable from the left creation toolbar AND a keyboard shortcut.

### 2.1 Select (V) — default
- Click an item to select
- Click empty canvas to deselect
- Drag on empty canvas draws a **marquee** — all items whose bbox intersects the marquee get selected
- Shift-click adds to selection
- Selected items show accent outline and resize handles

### 2.2 Hand (H)
- Turns cursor into grab/grabbing
- Click-drag pans canvas
- No item interaction

### 2.3 Sticky note (N)
- Click canvas → creates 220×220 sticky at cursor, enters edit mode immediately
- Drag from toolbar onto canvas: shows ghost preview following cursor, drops on release
- Current sticky color persists as the session default
- After creation, tool reverts to Select (single-use, like Miro)

### 2.4 Text (T)
- Click canvas → creates text widget, enters edit mode
- Text grows to fit content, minimum 100px wide
- Empty text on blur → widget is deleted
- Reverts to Select after creation

### 2.5 Shapes (S)
- Opens shape picker flyout with 8 shapes: rectangle, rounded rectangle, circle, ellipse, triangle, diamond, hexagon, parallelogram, arrow-block, cylinder, cloud, star
- Last-used shape is remembered per session
- Drag to draw at custom size, or click to place 180×120
- Shape renders as inline SVG
- Supports fill, stroke color, stroke width, text overlay

### 2.6 Pen (P)
- Free-form drawing — records point array at pointer sample rate
- Stroke smoothing using Catmull-Rom interpolation
- Color and width settable in contextual style bar
- Continuous tool — does NOT revert to Select after use
- Each stroke is a discrete item (can be deleted, undone)

### 2.7 Highlighter
- Same as pen but width 16px and opacity 40%
- Renders *below* other items in z-order
- Color palette same as pen

### 2.8 Eraser (E)
- Click-drag over pen strokes to delete them
- Hit-test: distance from pointer to any stroke point < stroke width + 8px
- Does NOT erase sticky/shape/text — only strokes
- Alternative behavior (Miro parity): mode toggle for "object eraser" that deletes any element

### 2.9 Connector / Line (L)
- Click a source item, then click a target item → creates connector
- Or: hover an item → 4 blue connector dots appear on sides → drag from a dot to another item
- Dragging a connector endpoint to empty space creates a "floating" endpoint that follows position
- Connector automatically routes around obstacles (Miro-style smart routing) — use orthogonal bezier
- Double-click connector to add text label
- Customizable: arrow style (none, arrow, filled arrow, diamond), line style (solid, dashed), thickness, color

### 2.10 Frame (F)
- Drag to define a rectangular frame at any size
- Frame has a title bar above it (editable)
- Default sizes menu: 1:1, 4:3, 16:9, A4 Portrait, A4 Landscape, Mobile, Tablet, Desktop
- Items inside a frame **move with it** when the frame is dragged
- Frames appear in the Frames panel and act as slides in Presentation Mode
- Renders visually *beneath* all non-frame items

### 2.11 Comment (C)
- Click canvas → places a red comment pin with empty thread
- Opens a panel to type the first comment + @-mentions
- See full behavior in §6

### 2.12 More (+) flyout
Lists: Upload image, Upload file, Embed URL, Video embed, Table, Card, Kanban, Mind map, Wireframe library, Code block, Iframe, Aedas AI, Revit snapshot, CAD drawing, BIM reference, Figma embed.

---

## 3. Board Elements

Shared behaviors across all elements:

- **Position:** stored in world coordinates (`x, y`)
- **Size:** `w, h` where applicable
- **Rotation:** `rotation` in degrees, 0 default, -180 to 180
- **Z-index:** implicit by array order in `items[]`; operations: bring to front, bring forward, send backward, send to back
- **Lock:** `locked: boolean` — locked items can't be moved/resized/deleted until unlocked
- **Protected lock:** `protected: boolean` — only owner/co-owner can unlock
- **Tags:** `tags: TagId[]` (see §7)
- **Created by / modified by:** userId references for audit

### 3.1 Sticky note
```
{ type: 'sticky', text, color, fontSize: 'auto'|14|18|24|32, tags }
```
- Auto-size text to fit (Miro default) or fixed-size mode
- Emoji picker accessible via `:` trigger inline
- Formatting: bold, italic, underline, strikethrough, bullet list, link
- Can be resized; text rescales

### 3.2 Text widget
```
{ type: 'text', text, fontSize, fontFamily, fontWeight, align, color }
```
- Rich text formatting
- Font family selector (Inter, Instrument Serif, JetBrains Mono, system options)
- Alignment: left, center, right, justify

### 3.3 Shape
```
{ type: 'shape', kind, fill, stroke, strokeWidth, strokeStyle, text, textAlign, textColor }
```
- Same text formatting as text widget
- Stroke styles: solid, dashed, dotted

### 3.4 Connector
```
{ type: 'connector', from: {itemId|point}, to: {itemId|point}, style, text, arrowStart, arrowEnd, waypoints[] }
```
- `waypoints[]` lets users bend the line manually; auto-cleared when both ends are item-anchored

### 3.5 Frame
```
{ type: 'frame', title, bg, aspect, index, children: itemId[] }
```
- `index` determines slide order in presentation mode
- `children` maintained automatically based on geometric containment

### 3.6 Image
```
{ type: 'image', src, naturalW, naturalH, filters: {brightness, contrast, saturate} }
```
- Drag-drop upload from filesystem
- Paste from clipboard
- URL import
- Crop tool
- Alt text field for accessibility

### 3.7 Card
```
{ type: 'card', title, description, assignee, dueDate, tags, customFields: {} }
```
- Kanban-compatible
- Custom fields configurable at board level (text, number, date, select, multiselect, checkbox)
- Can be converted to/from sticky

### 3.8 Table
```
{ type: 'table', rows, cols, data: string[][], colWidths, rowHeights }
```
- Inline editing per cell
- Add/remove rows and columns
- Cell merging
- Header row/column toggle

### 3.9 Mind map
```
{ type: 'mindmap', root: NodeId, nodes: {id, text, parentId, color, children[]} }
```
- Tab key adds child, Enter adds sibling
- Auto-layout with configurable direction (horizontal, vertical, radial)

### 3.10 Pen stroke
```
{ type: 'stroke', points: [[x,y], ...], color, width, tool: 'pen'|'highlighter' }
```

### 3.11 Comment pin
```
{ type: 'comment', threadId, resolved: boolean }
```
See §6 for thread data model.

---

## 4. Selection, Editing, Manipulation

### 4.1 Single selection
- Click item → `selectedIds = [id]`
- Selected item renders `--accent` outline offset 4px
- 8 resize handles appear (4 corners, 4 edges)
- Rotation handle above top-center edge

### 4.2 Multi-selection
- Shift-click adds/removes from selection
- Marquee drag selects multiple
- Cmd/Ctrl+A selects all items in viewport
- Bounding box renders around all selected items
- Operations apply to all: move, delete, color change (when compatible), copy

### 4.3 Transform
- **Move:** drag anywhere inside selection bbox
- **Resize:** drag a handle; Shift = maintain aspect ratio; Alt = resize from center
- **Rotate:** drag rotation handle; Shift = snap to 15° increments
- Live geometry values shown in a small chip above selection: `W × H` or `angle°`

### 4.4 Group / Ungroup
- `Cmd/Ctrl+G` groups selection — items move/resize/rotate as one
- `Cmd/Ctrl+Shift+G` ungroups
- Groups render a subtle outline on hover
- Nested groups supported

### 4.5 Align & distribute
- When 2+ items selected, a contextual align panel appears
- Options: align left, center-h, right, top, middle-v, bottom; distribute horizontally, distribute vertically; tidy up (grid snap)
- Keyboard: arrow keys nudge 1px, Shift+arrow nudge 10px

### 4.6 Copy, paste, duplicate
- `Cmd/Ctrl+C` copies to clipboard (as JSON + image fallback)
- `Cmd/Ctrl+V` pastes at cursor position
- `Cmd/Ctrl+D` duplicates with 30px offset
- Cross-board paste works by serializing to clipboard JSON

### 4.7 Undo / Redo
- Stack of operations (not state snapshots) — each op is invertible
- Per-user local stack: undo only reverts YOUR changes, skipping other users' intervening edits
- Stack size: 200 operations per session
- Visible in top bar chip: "undid: moved 3 items"

### 4.8 Context menu (right-click)
Common actions (adapt based on selection type):
- Cut / Copy / Paste / Duplicate
- Bring to front / forward / backward / to back
- Group / Ungroup
- Lock / Unlock
- Add to frame
- Copy link to selection
- Add comment
- Add tags
- Export selection as PNG/SVG
- Delete

---

## 5. Multi-user Collaboration

### 5.1 Realtime presence
- Every connected user is rendered as a **live cursor** with their name and color
- Cursor position updates via CRDT/OT sync — smooth interpolate between network frames (1200ms ease)
- Name label appears next to cursor when user is actively moving; fades after 2s idle
- Clicking another user's cursor opens their profile card

### 5.2 Presence panel (top-right)
- Avatars stacked, up to 4 visible + overflow chip
- Click any avatar → options:
  - **Follow** — your viewport locks to theirs
  - **Bring to me** — pans their viewport to yours (requires their permission for observers)
  - **Start video chat** — opens video panel
  - **Send message** — opens DM inside the board

### 5.3 Follow mode
- Selecting follow: your viewport continuously tracks that user's pan + zoom
- A banner appears: "Following Karim · Click to stop"
- Any pan/zoom action exits follow mode
- Multiple users can follow the same facilitator

### 5.4 Concurrent editing
- CRDT for text fields (sticky, shape, text widget, comment)
- Last-writer-wins for position/size (with operation timestamps)
- When two users type in the same sticky simultaneously, both cursors appear inside the text
- Each user's character insertions colored subtly with their cursor color for 2s then fade to default

### 5.5 Video & voice
- Built-in video chat panel (up to 25 participants)
- WebRTC-based, draggable around screen
- Audio-only mode
- Screen share: broadcasts your canvas viewport to all followers
- Live reactions: emoji burst floats from avatar for 2s

### 5.6 Live chat
- Chat panel accessible from presence bar
- Persists within the board session
- Supports @mentions (links to user profile), emoji, file drops

### 5.7 Attention management
- Facilitator action: "Bring everyone to me"
- Teleports all board users' viewports to facilitator's current view
- Users can opt out via board setting: "Allow others to control my view: Yes/No/Ask"

### 5.8 Private mode
- Individual user toggle: "Hide my work until I'm done"
- Their edits are invisible to others until they click "Reveal"
- Useful for independent brainstorming before group sync
- Others see a frosted-glass placeholder where the user is working

---

## 6. Comments & Mentions

### 6.1 Comment pin
- Created via Comment tool (C) or right-click → Add comment
- Pin contains a **thread** of comments
- Pin color indicates status: `--accent` (open), `--muted` (resolved)
- Pin floats above canvas at fixed screen size regardless of zoom

### 6.2 Thread panel
- Click pin → panel slides out from the pin (right side, 280px wide)
- Shows avatar, author name, timestamp, comment body, reactions
- Input at bottom with:
  - Rich text (bold, italic, links, code)
  - `@` trigger opens user picker (see §6.4)
  - `#` trigger opens tag picker
  - Emoji picker
  - File/image attachment
- Actions per comment: edit (own only), delete (own or admin), react, reply, copy link

### 6.3 Thread actions
- **Resolve** button at top of thread — collapses pin to muted state
- **Reopen** available on resolved threads
- **Assign to...** — assigns a thread to one user (shows their avatar on pin)
- **Mark as follow-up** — adds to your Follow-ups panel

### 6.4 @mentions
Two contexts — both supported:

**In comments:**
- Type `@` → dropdown of board members matching
- Arrow keys navigate, Enter selects
- Mentioned user receives notification (email + in-app)
- `@board` mentions everyone on the board
- `@channel` equivalent: `@all`
- Self-mention allowed (shows in their follow-ups)

**In-text mentions (sticky/shape/text widget):**
- Same `@` trigger works inside any text field
- Renders as a pill with avatar + name, colored with user color at 15% background
- Hover shows profile card with role, last seen, DM button
- Triggers notification if user is a board member

### 6.5 Profile card
Hover any mention or avatar:
- Large avatar
- Name, role, team
- "Last seen: 12 minutes ago"
- Actions: View profile, Send message, Add to board, Copy email

### 6.6 Notifications fanout
When a comment is posted:
1. All @mentioned users → in-app + email + push (if installed)
2. Thread participants (previously commented) → in-app + email
3. Board watchers (opted in) → in-app
4. Assigned user → in-app + email with higher priority

---

## 7. Tagging System

Tags organize content across a board and are searchable.

### 7.1 Tag data model
```
{ id, label, color, createdBy, createdAt, boardId }
```
- Board-scoped (not global)
- Color from a fixed palette of 12 (distinct from user cursor colors)

### 7.2 Applying tags
- Right-click item → "Add tag" → picker
- Or: in style bar when item selected, tag icon opens picker
- Picker has:
  - Search input
  - List of existing tags with checkboxes
  - "Create new tag" button at bottom
- Items display tags as small pills in their bottom-right corner (max 3 visible + overflow)

### 7.3 Tags on sticky/text
- When a sticky has tags, they render as colored dots at the bottom
- Hovering a dot reveals label
- Clicking a dot filters the board to items sharing that tag

### 7.4 Tag filter panel
- Accessible from top bar → Filter icon
- Lists all tags with counts
- Multi-select toggles filter
- When filter active: non-matching items fade to 20% opacity
- "Exit filter" button in top-bar chip

### 7.5 Tag-based actions
- Bulk select by tag: right-click tag in panel → "Select all items with this tag"
- Export filtered view as image/PDF
- Tag analytics: show distribution in a mini pie chart (for retros, voting recaps)

### 7.6 Tagging people (not content)
Separate from content tags — when you @-mention someone in a sticky, that sticky is marked as "assigned" to them visually (small avatar in corner). This creates a task list they can view in their personal dashboard.

---

## 8. Facilitation Tools

All facilitation tools live in the **Collaboration bar** (top-right area, next to the presence avatars). Board owners & co-owners can restrict who can start them.

### 8.1 Timer
- Click timer icon → set duration (minutes) → Start
- Circular progress ring visible to all users
- Sound at 30s, 10s, 0s (can be muted per user)
- Pause, add time (+1m, +5m), stop
- Optional: plays lofi background music from a curated library

### 8.2 Voting
- Click voting icon → voting panel slides in
- Settings:
  - Votes per participant (1-99)
  - Duration (1 min – 7 days)
  - One vote per object max (toggle)
  - Anonymous (default true)
  - Voting area (select items or "entire board")
- Start → banner appears for all users with "Join voting"
- Each user sees + / − icons on votable items
- During session: facilitator sees participant progress
- On end: top 3 results highlighted, full rankings available
- Results can be kept visible on board (toggle)
- Session history persisted per board

### 8.3 Reactions
- Users click the reactions icon → emoji burst at their cursor position
- Visible to all for 3 seconds
- Curated set: 👍 ❤️ 🎉 🤔 ✨ 👏 🙌 🔥
- Audio cue when a user sends you a reaction (optional)

### 8.4 Estimation (planning poker)
- Each participant gets cards (Fibonacci or T-shirt sizes)
- Select an item to estimate → everyone picks a card privately
- On reveal: all cards shown simultaneously next to item
- Average + median displayed
- Session recorded for retro

### 8.5 Attention management
- "Bring everyone here" button teleports all users' viewport to facilitator
- "Follow me" auto-enables follow mode for all participants
- "Lock participants' ability to edit" temporarily makes board read-only for non-facilitators

### 8.6 Visual notes
- Lightweight floating text editor accessible via icon
- Sticky positioned at screen edge (doesn't move with canvas)
- For quick meeting notes, action items, decisions
- Auto-attaches to board on close

### 8.7 Talktrack (async video walkthrough)
- Facilitator records video + their voice narrating a canvas tour
- Cursor movements and zoom/pan are recorded
- Playback UI: timeline with chapters, speed control
- Sharable as a link, embeddable elsewhere

---

## 9. Frames & Presentation Mode

### 9.1 Frames panel
- Left-edge panel toggled via View → Frames
- Shows thumbnail list of all frames in presentation order
- Drag to reorder
- Click jumps viewport to that frame
- Rename in-place

### 9.2 Presentation mode
- Top bar "Present" button enters presentation mode
- Chrome hides; one frame fills the screen
- Navigation: arrow keys, space (next), shift+space (prev), Esc to exit
- Presenter notes appear below frame (visible only to presenter)
- Laser pointer: hold P key while clicking for a red dot trail
- Follow-me mode: all viewers' screens advance with presenter

### 9.3 Interactive presentations
- Unlike slides, the underlying canvas is live — users can interact with frames during presentation
- Presenter can toggle "Allow interaction" on/off per frame
- Users can add comments, reactions, votes without leaving presentation

### 9.4 Export frames
- Export each frame as a PNG/PDF slide
- Entire board as multi-page PDF, one frame per page

---

## 10. Templates

### 10.1 Template gallery
- Accessed from left toolbar (Templates icon) or from blank-board prompt
- Modal with:
  - Search
  - Categories: Strategy, Brainstorming, Research, Agile, Design, Mapping, Architecture (Aedas-specific)
  - Tags: Popular, New, Aedas Studio
  - Preview of each template
- Aedas-specific templates (ship with product):
  - Site Analysis Canvas
  - Concept Development / Parti Diagram
  - Design Critique Pinup
  - User Journey (spatial)
  - Project Kickoff
  - Sprint Retro
  - BIM Coordination Review
  - Stakeholder Map
  - Materiality Board
  - Program Spatial Matrix
- Plus standard templates (Miro parity): Flowchart, Mind Map, Kanban, User Story Map, Customer Journey, Business Model Canvas, SWOT, 5 Whys, Retrospective, Icebreakers

### 10.2 Applying a template
- Click template → preview → "Use template"
- Template inserts at current viewport center
- All template elements editable immediately
- Can apply multiple templates on same board

### 10.3 Custom templates
- Any board (or section via selection) can be saved as a template
- Private templates (user only), team templates (Aedas-wide), studio templates (specific studio)
- Template metadata: name, description, tags, thumbnail, cover color

---

## 11. Media & Embeds

### 11.1 Image
- Supported formats: PNG, JPG, WEBP, GIF, SVG, HEIC
- Max file size: 30MB
- Max resolution: 32MP
- Upload methods: drag-drop, paste, URL, device camera (mobile), screenshot tool
- On-canvas editing: crop, rotate, flip, filter (brightness/contrast/saturation), alt text

### 11.2 Video
- Upload MP4, MOV, WEBM
- Max 100MB per file
- Plays inline with controls on hover
- Loop toggle
- Paste YouTube/Vimeo URL → embedded player

### 11.3 Documents
- PDF: preview first page on canvas; click to view full document in overlay
- DOCX, XLSX, PPTX: rendered preview via a document service
- CAD/DWG: rendered as raster preview with zoom/pan; annotations can be layered on top
- Revit RVT: opens a 3D viewer inline

### 11.4 Iframe embeds
- Paste any embeddable URL → auto-embeds if recognized
- Curated embed types: Figma, YouTube, Vimeo, Google Docs, Google Sheets, Airtable, Loom, Lucidchart, Notion, Spotify, Miro-to-Aedas migration (yes, ironic — but needed for teams in transition)

### 11.5 Web page screenshot
- Paste a URL while holding Shift → inserts a screenshot of the webpage
- Rendered via server-side headless browser

---

## 12. AI Assistant

### 12.1 Aedas AI sidepanel
- Invoked via `Cmd/Ctrl+K` or sparkle icon in more (+) menu
- Input: natural language prompt
- Context: current selection OR entire board OR specific frame

### 12.2 AI capabilities
- **Generate stickies:** "Give me 15 ways to improve the lobby experience"
- **Summarize:** selects all stickies in a frame, produces a summary sticky
- **Cluster:** takes a pile of stickies and auto-groups them by theme
- **Diagram:** "Create a flowchart for tenant onboarding"
- **Expand:** select a sticky, AI generates 5 child ideas
- **Rewrite:** select text, AI tightens, expands, translates, changes tone
- **Image:** "Create a moodboard for brutalist civic architecture" — generates 4 images
- **Transcribe sketches:** select a pen sketch, AI attempts OCR + shape recognition
- **Smart drawing:** pen tool mode that snaps freehand into clean shapes

### 12.3 AI sidekicks (pre-configured assistants)
- Insight Synthesizer — analyzes research boards
- Sprint Accelerator — turns goals into task cards
- Design Critique Bot — gives structured feedback on pinned designs
- BIM Coordinator — flags clashes described in sticky notes

### 12.4 AI boundaries
- Never trains on board content
- Aedas-controlled model endpoint (enterprise-grade)
- Clearly marked: every AI-generated element has a small ✨ sparkle badge
- "Accept / Revise / Discard" for every generation

---

## 13. Navigation & Viewport

### 13.1 Minimap
- Bottom-right, toggleable
- Shows entire board content as zoomed-out thumbnail
- Viewport rectangle indicates current view — draggable to pan
- Other users' cursors visible as colored dots

### 13.2 Outline / Layers panel
- Tree view of all frames and their contained items
- Reorder z-index by drag
- Toggle visibility per layer
- Lock/unlock per layer

### 13.3 Zoom controls
- − / zoom % / +
- Click zoom % → dropdown with: 25, 50, 75, 100, 150, 200, 400, Fit to selection, Fit to board
- Fit-to-screen icon

### 13.4 Search on board
- `Cmd/Ctrl+F` opens search input (top of canvas)
- Searches all text content (stickies, text, shapes, comments, frame titles)
- Results list with thumbnails; click jumps viewport to item
- Highlight found items with temporary accent glow

---

## 14. Sharing & Permissions

### 14.1 Share modal
Opened via the Share button (top-right).

Contents:
- **Invite by email** — input with role selector (Editor, Commenter, Viewer)
- **Who has access list** — all current members with role selector and remove option
- **Share link** — copy URL + role for anyone with link
- **Public toggle** — makes board publicly viewable
- **Embed code** — iframe snippet for embedding in other tools
- **Advanced** — password protection, expiry date, domain restriction

### 14.2 Roles
| Role | Capabilities |
|---|---|
| Owner | Everything, including delete, transfer ownership, permission settings |
| Co-owner | Everything except transfer/delete board |
| Editor | Create, modify, delete items; use collaboration tools |
| Commenter | Add comments, reactions; no content changes |
| Viewer | Read-only, can pan/zoom |

### 14.3 Visitor access
- Non-Aedas users can be invited as visitors with edit or view access
- Visitors get a magic link (no signup required)
- Visitor access can be time-boxed (1 hour, 1 day, 1 week, 30 days, never expires)
- Visitor actions are labeled "Guest" in history

### 14.4 Board-level settings
- Data classification (Public, Internal, Confidential, Restricted)
- Who can start collaboration tools
- Who can export
- Who can duplicate
- Anonymous comments (on/off)
- Require sign-in to view
- Watermarked exports (for confidential boards)

### 14.5 Workspace / studio hierarchy
- Aedas organization → Studios (London, Dubai, HK, etc.) → Teams → Boards
- Permission inheritance: studio admins automatically have access to studio boards
- Cross-studio sharing requires explicit invitation

---

## 15. Version History

### 15.1 Snapshot cadence
- Autosave every 5 seconds (diff-based)
- Named snapshots on: significant pauses (10+ min idle), before template apply, before bulk delete, manual "Save version"

### 15.2 History panel
- Accessed via Main Menu → Version History
- Timeline of versions with:
  - Timestamp
  - Contributors (avatars)
  - Summary ("+12 stickies, 3 comments resolved")
  - Named versions shown prominently
- Click a version → preview in read-only mode
- "Restore this version" creates a new version (never destructive)

### 15.3 Autosave indicator
- Top-bar chip shows "saved · just now" / "saving…" / "offline — changes will sync"
- Offline mode: edits queued locally, synced on reconnect

---

## 16. Search & Command Palette

### 16.1 Command palette
- `Cmd/Ctrl + /` opens global command palette
- Input with fuzzy search across:
  - Tool commands (New sticky, Switch to pen, etc.)
  - Board actions (Start voting, Open timer, Share)
  - Navigation (Go to frame "X", Zoom to 100%)
  - Templates (Insert Site Analysis Canvas)
  - Recent items
- Arrow keys navigate, Enter runs, Esc closes

### 16.2 Global search
- Top bar search icon opens workspace-wide search
- Searches across boards, templates, people, comments
- Filters: by board, by author, by date range, by type

---

## 17. Notifications

### 17.1 In-app notifications
- Bell icon in top bar
- Panel shows:
  - Mentions in comments/stickies
  - Assignments (tasks assigned to you)
  - Thread replies
  - Board shared with you
  - Vote results
  - Comments on your content
- Unread counter badge

### 17.2 Email notifications
- Sent on @mention, assignment, comment reply, board share
- Daily digest option
- Per-board notification settings: All activity / Mentions only / None

### 17.3 Push notifications (mobile & desktop app)
- Same triggers as email, with quick-reply from notification

### 17.4 Slack / Teams integration
- Post mentions and comments to a designated channel
- Reply inline from Slack → syncs back to Aedas Board

---

## 18. Integrations

Must-have integrations for launch:

| Tool | What it does |
|---|---|
| **Slack** | Post board updates, receive mention notifications, invite via Slack |
| **Microsoft Teams** | Embed boards in channels, meeting integration |
| **Jira** | Convert sticky to issue, sync status both ways |
| **Asana** | Sticky → task |
| **Google Drive** | Import docs, sheets, slides; native preview |
| **Google Calendar** | Schedule meetings with board link |
| **Figma** | Embed Figma frames live |
| **Zoom** | Join Zoom meeting inside board |
| **Revit / BIM 360** | (Aedas-specific) pull model snapshots |
| **AutoCAD Web** | Embed DWG drawings |
| **Rhino** | Embed 3D model viewer |
| **Dropbox / OneDrive** | File imports |
| **Confluence** | Two-way sync with Confluence pages |
| **Notion** | Embed boards in Notion, embed Notion pages in boards |

---

## 19. Mobile & Touch

### 19.1 Mobile app (iOS + Android)
- View, comment, react to boards
- Limited creation: sticky, pen, text, photo upload
- Touch gestures:
  - One finger = pan
  - Two finger pinch = zoom
  - Long-press item = select
  - Two-finger long-press = context menu
- Camera integration: photograph sketches → OCR'd into editable text

### 19.2 Tablet (iPad, Surface, Galaxy Tab)
- Full editing experience
- Stylus support:
  - Apple Pencil, Surface Pen, Samsung S Pen
  - Pressure sensitivity on pen strokes
  - Palm rejection
  - Double-tap pencil = switch between pen and eraser
- Touch toolbar adapts: larger buttons (48×48), different flyout positions

### 19.3 Interactive display / smart board
- Toolbar moves to bottom of screen
- Larger UI elements
- Tap-and-hold alternative for right-click
- Quick sign-in mode for shared displays (QR code handoff to personal device)

---

## 20. Data Model Reference

### 20.1 Top-level
```
Board {
  id, name, ownerId, orgId, studioId, teamId,
  classification, createdAt, updatedAt,
  items: Item[], strokes: Stroke[],
  frames: Frame[], connectors: Connector[],
  comments: Comment[], tags: Tag[],
  members: Member[], settings: BoardSettings,
  versions: Version[],
  backgroundType: 'dots' | 'grid' | 'lines' | 'blank'
}
```

### 20.2 Item (base)
```
Item {
  id, type, x, y, w, h, rotation,
  locked, protected,
  tags: TagId[],
  createdBy, createdAt, modifiedBy, modifiedAt,
  zIndex
}
```

### 20.3 Member
```
Member {
  userId, role: 'owner'|'coowner'|'editor'|'commenter'|'viewer',
  invitedBy, invitedAt, acceptedAt,
  cursor: { x, y, color }, viewport: { pan, zoom },
  status: 'online'|'idle'|'offline',
  followingUserId: UserId|null,
  privateMode: boolean
}
```

### 20.4 Comment thread
```
Comment {
  id, x, y, resolved, assignedTo,
  thread: [{ id, authorId, text (markdown), mentions: UserId[],
             attachments, reactions, createdAt, editedAt }]
}
```

### 20.5 Sync protocol
- WebSocket-based with message types: `op` (operation), `presence` (cursor/viewport), `chat`, `system`
- Operations use a CRDT for text and list-of-items
- Operations are idempotent and commutative where possible
- Server is authoritative for permissions; clients optimistically apply ops and roll back on rejection
- Snapshot every 1000 ops or 5 minutes for cold-start performance

### 20.6 Offline support
- Service worker caches current board
- Edits queued to IndexedDB while offline
- On reconnect, queued ops replayed through CRDT merge
- Conflict UI: "3 of your changes couldn't be applied — review"

---

## 21. Performance Targets

| Metric | Target |
|---|---|
| Initial board load (1000 items) | < 1.5s |
| Input-to-visual latency (pan, zoom, draw) | < 16ms (60 fps) |
| Realtime cursor propagation | < 150ms p95 |
| Sticky edit → visible to all | < 250ms p95 |
| Supported items per board | 50,000+ |
| Concurrent users per board | 100+ |
| Max active cursors rendered | 50 (rest collapsed to "+N" indicator) |

### Rendering strategy
- Items outside viewport are not mounted (virtualization)
- Pen strokes rendered via single SVG element with all polylines
- Zoom < 25% switches to a simplified "overview" render (text becomes placeholder boxes)
- All drag/resize operations use CSS transforms (no React re-renders during manipulation)

---

## 22. Definition of Done — Launch Checklist

For v1 to replace Miro in the studio:

- [ ] All creation tools functional and at parity
- [ ] Multi-user sync with cursors, presence, comments
- [ ] @mentions in comments AND in-text widgets
- [ ] Tag system with filtering
- [ ] Voting + timer + reactions
- [ ] Templates: 20+ including all 10 Aedas-specific
- [ ] Present mode with frames
- [ ] Version history with restore
- [ ] Share modal with 5 permission levels
- [ ] Image + PDF + video + URL embed
- [ ] Keyboard shortcuts (all §13 of DESIGN.md)
- [ ] Mobile web responsive + native app parity for viewing
- [ ] Slack + Teams + Google Drive integrations live
- [ ] Export: PNG, PDF, SVG, CSV (stickies), JSON (full)
- [ ] Migration tool: import Miro board JSON → Aedas Board
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Performance targets met on median MacBook Air M1
- [ ] Penetration test + SOC 2 readiness

---

*This spec is the contract. The design system (DESIGN.md) is the language. Build both together.*
