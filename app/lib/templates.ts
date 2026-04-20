"use client";

import { newId, type Item } from "./board-store";

export type TemplateDef = {
  id: string;
  name: string;
  category: "Architecture" | "Design" | "Strategy" | "Agile";
  description: string;
  cover: string; // CSS color for the card cover
  build: (center: { x: number; y: number }) => Item[];
};

const INK = "var(--ink)";
const MUTED = "var(--ink-soft)";

function sticky(x: number, y: number, color: string, text: string): Item {
  return {
    id: newId("sticky"),
    type: "sticky",
    x,
    y,
    w: 200,
    h: 200,
    rotation: 0,
    text,
    color,
    textColor: INK,
    fontFamily: "sans",
    fontSize: 15,
    fontWeight: 500,
    align: "left",
  };
}

function text(x: number, y: number, str: string, size = 20, weight = 500, align: "left" | "center" | "right" = "left"): Item {
  return {
    id: newId("text"),
    type: "text",
    x,
    y,
    w: 220,
    h: 30,
    rotation: 0,
    text: str,
    fontSize: size,
    fontFamily: "sans",
    fontWeight: weight,
    align,
    autoSize: true,
    color: MUTED,
  };
}

function headline(x: number, y: number, str: string): Item {
  return {
    id: newId("text"),
    type: "text",
    x,
    y,
    w: 400,
    h: 40,
    rotation: 0,
    text: str,
    fontSize: 28,
    fontFamily: "serif",
    fontWeight: 400,
    italic: true,
    align: "left",
    autoSize: true,
    color: INK,
  };
}

function frame(x: number, y: number, w: number, h: number, title: string): Item {
  return {
    id: newId("frame"),
    type: "frame",
    x,
    y,
    w,
    h,
    rotation: 0,
    title,
  };
}

function shape(x: number, y: number, w: number, h: number, label: string, kind: "rectangle" | "rounded" | "oval" = "rectangle"): Item {
  return {
    id: newId("shape"),
    type: "shape",
    x,
    y,
    w,
    h,
    rotation: 0,
    kind,
    text: label,
    fill: "#FFFFFF",
    stroke: INK,
  };
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: "site-analysis",
    name: "Site Analysis Canvas",
    category: "Architecture",
    description: "Capture movement, sun, context, and constraints for a site.",
    cover: "var(--sticky-sage)",
    build: ({ x, y }) => {
      const cx = x - 460;
      const cy = y - 280;
      return [
        headline(cx, cy - 40, "Site Analysis"),
        frame(cx, cy, 920, 560, "Site Analysis"),
        text(cx + 20, cy + 20, "Context", 14, 600),
        sticky(cx + 20, cy + 50, "var(--sticky-canary)", "Pedestrian flow — strongest N–S on east edge."),
        sticky(cx + 240, cy + 50, "var(--sticky-sky)", "Afternoon sun — west façade overheats."),
        sticky(cx + 460, cy + 50, "var(--sticky-sage)", "Retain mature planes — CDA + community."),

        text(cx + 20, cy + 280, "Constraints", 14, 600),
        sticky(cx + 20, cy + 310, "var(--sticky-peach)", "Height limit: 18m to datum."),
        sticky(cx + 240, cy + 310, "var(--sticky-rose)", "Conservation area — materials restricted."),
        sticky(cx + 460, cy + 310, "var(--sticky-lilac)", "Easement along north boundary."),
      ];
    },
  },
  {
    id: "concept-development",
    name: "Concept Development",
    category: "Architecture",
    description: "Parti diagram starter: idea, massing, circulation.",
    cover: "var(--sticky-peach)",
    build: ({ x, y }) => {
      const cx = x - 380;
      const cy = y - 240;
      return [
        headline(cx, cy - 40, "Concept · Parti"),
        frame(cx, cy, 760, 480, "Concept"),
        shape(cx + 60, cy + 60, 180, 180, "IDEA", "oval"),
        shape(cx + 300, cy + 60, 180, 180, "MASSING"),
        shape(cx + 540, cy + 60, 160, 180, "FLOW", "rounded"),
        sticky(cx + 60, cy + 270, "var(--sticky-canary)", "The one move — what is the building about?"),
        sticky(cx + 300, cy + 270, "var(--sticky-sage)", "Proportion, articulation, skyline."),
        sticky(cx + 540, cy + 270, "var(--sticky-sky)", "Entry sequence, vertical cores."),
      ];
    },
  },
  {
    id: "design-critique",
    name: "Design Critique Pinup",
    category: "Design",
    description: "Room for plans, pinned comments, and decisions.",
    cover: "var(--sticky-lilac)",
    build: ({ x, y }) => {
      const cx = x - 420;
      const cy = y - 260;
      return [
        headline(cx, cy - 40, "Design Critique"),
        frame(cx, cy, 840, 520, "Pinup"),
        shape(cx + 40, cy + 40, 220, 320, "Plan A"),
        shape(cx + 300, cy + 40, 220, 320, "Plan B"),
        shape(cx + 560, cy + 40, 240, 320, "Elevation"),
        text(cx + 40, cy + 380, "Strengths", 14, 600),
        sticky(cx + 40, cy + 410, "var(--sticky-sage)", "Circulation reads clearly."),
        text(cx + 300, cy + 380, "Concerns", 14, 600),
        sticky(cx + 300, cy + 410, "var(--sticky-rose)", "North elevation is flat."),
        text(cx + 560, cy + 380, "Decisions", 14, 600),
        sticky(cx + 560, cy + 410, "var(--sticky-canary)", "Pursue Plan A. Revisit Tuesday."),
      ];
    },
  },
  {
    id: "retro",
    name: "Sprint Retrospective",
    category: "Agile",
    description: "Went well · To improve · Action items.",
    cover: "var(--sticky-sky)",
    build: ({ x, y }) => {
      const cx = x - 420;
      const cy = y - 220;
      return [
        headline(cx, cy - 40, "Retrospective"),
        frame(cx, cy, 840, 440, "Retro"),
        text(cx + 40, cy + 20, "Went well", 14, 600),
        sticky(cx + 40, cy + 50, "var(--sticky-sage)", ""),
        sticky(cx + 40, cy + 260, "var(--sticky-sage)", ""),
        text(cx + 300, cy + 20, "To improve", 14, 600),
        sticky(cx + 300, cy + 50, "var(--sticky-peach)", ""),
        sticky(cx + 300, cy + 260, "var(--sticky-peach)", ""),
        text(cx + 560, cy + 20, "Action items", 14, 600),
        sticky(cx + 560, cy + 50, "var(--sticky-canary)", ""),
        sticky(cx + 560, cy + 260, "var(--sticky-canary)", ""),
      ];
    },
  },
  {
    id: "stakeholder-map",
    name: "Stakeholder Map",
    category: "Strategy",
    description: "Influence vs interest grid with labels.",
    cover: "var(--sticky-canary)",
    build: ({ x, y }) => {
      const cx = x - 380;
      const cy = y - 260;
      return [
        headline(cx, cy - 40, "Stakeholder Map"),
        frame(cx, cy, 760, 520, "Stakeholders"),
        shape(cx + 40, cy + 40, 340, 220, "Manage closely"),
        shape(cx + 400, cy + 40, 320, 220, "Keep satisfied"),
        shape(cx + 40, cy + 280, 340, 220, "Inform"),
        shape(cx + 400, cy + 280, 320, 220, "Monitor"),
        text(cx + 20, cy - 8, "High influence →", 12, 500),
        text(cx - 2, cy + 250, "↑ High interest", 12, 500),
      ];
    },
  },
  {
    id: "kickoff",
    name: "Project Kickoff",
    category: "Strategy",
    description: "Goals, risks, team, timeline — on one page.",
    cover: "var(--sticky-rose)",
    build: ({ x, y }) => {
      const cx = x - 420;
      const cy = y - 220;
      return [
        headline(cx, cy - 40, "Kickoff"),
        frame(cx, cy, 840, 420, "Kickoff"),
        text(cx + 40, cy + 20, "Goals", 14, 600),
        sticky(cx + 40, cy + 50, "var(--sticky-sky)", "What does success look like?"),
        text(cx + 300, cy + 20, "Risks", 14, 600),
        sticky(cx + 300, cy + 50, "var(--sticky-peach)", "What could derail us?"),
        text(cx + 560, cy + 20, "Timeline", 14, 600),
        sticky(cx + 560, cy + 50, "var(--sticky-canary)", "First milestone & cadence."),
      ];
    },
  },
];
