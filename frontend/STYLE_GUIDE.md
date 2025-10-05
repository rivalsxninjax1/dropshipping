# Dropshipper Design System — Style Guide

## Color Usage

- Primary (indigo): use for primary actions, focused states, links.
- Secondary (sky): complementary actions and highlights.
- Accent (amber): badges, notifications, emphasis — use sparingly.
- Neutral: backgrounds, borders, typography. Prefer higher contrast for text.
- Dark Mode: enabled via `class` on `html` (or `document.documentElement`). Ensure sufficient contrast.

## Typography

- Base font: system UI with Inter for headings (`font-heading`).
- Scale: Tailwind `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`.
- Headings use tighter line-height and semibold weight.

## Components

- Buttons: use `primary` for main CTA, `secondary` for less prominent actions, `outline` for tertiary actions, `destructive` for irreversible actions.
- Cards: wrap product info with shadow `shadow-card`. Keep imagery consistent with `aspect-[4/3]` and `object-cover`.
- Inputs: always provide an accessible label; use `aria-invalid` on error.
- Navigation: mobile drawer for small screens, persistent header on desktop.

## Micro-interactions

- Hover: increase background contrast or underline links.
- Active: slightly reduce brightness or scale (e.g., `active:opacity-90`).
- Focus: use visible rings (Tailwind `focus-visible:ring-2`) with brand color.

## Spacing & Radius

- Use token scales from `src/tokens.json` to keep spacing and radii consistent.

