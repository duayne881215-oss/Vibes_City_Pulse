# Vibes City Pulse

A premium, modular, mobile-first social app foundation with a dark aesthetic, featuring mood tracking, map-based discovery, and messaging.

## Generated with GenMB

This project was generated using [GenMB](https://genmb.com) - AI-powered application builder.

### Original Prompt

> Create a clean, modular, mobile-first social/dating app called Vibes.

STYLE:
- Premium dark UI
- Elegant, minimal, modern
- Smooth spacing, aligned elements, rounded corners
- Visually polished but lightweight
- Avoid clutter, avoid duplicated buttons, avoid unnecessary overlays

ARCHITECTURE:
- Build with a clean modular structure
- Separate concerns clearly into layout, navigation, panels, map, profile, messages, mood, and settings
- Keep code simple, readable, and easy to refine later
- Avoid duplicate event listeners
- Avoid inline scripts when possible
- Avoid conflicting handlers
- Avoid broken dependencies
- Make all UI components reusable and isolated

INITIAL SCOPE:
Build only the stable foundation first, not the full app.

SCREEN 1:
- Main mobile app shell
- Top header with:
  - App name: Vibes
  - Mood/status text
  - Small profile avatar on right
- Bottom navigation with exactly 4 tabs:
  - Mood
  - Map
  - Messages
  - Profile

MAIN AREA:
- Map view placeholder or simple dark map container
- Clean centered content
- No heavy animations yet
- No story uploader yet
- No floating extra buttons yet
- No duplicated menus
- No popups opening automatically

PANELS:
- Mood panel
- Messages panel
- Profile panel
- Settings panel
Each panel must:
- Open and close correctly
- Close when tapping outside if appropriate
- Never overlap in a broken way
- Never open the wrong panel
- Never open automatically on load

FUNCTIONAL RULES:
- Every nav button must work
- Mood opens only Mood panel
- Map opens only Map view
- Messages opens only Messages panel
- Profile opens only Profile panel
- Settings should only open from profile area, not from mood or map
- No duplicated “online”
- No duplicated labels
- No invisible blocking layers
- No broken close buttons
- No login popup unless explicitly triggered by user action

TECHNICAL RULES:
- Use stable IDs and unique selectors
- Ensure all handlers bind only once
- Prevent event duplication after rerender
- Keep CSS organized and lightweight
- Avoid giant monolithic files if possible
- Make future refinement safe and predictable

OUTPUT GOAL:
Generate a stable clean base app that looks premium, works reliably on mobile, and is ready for future features without current bugs.

## Getting Started

### Prerequisites

- Node.js 18+

### Running Locally

```bash
npm install
npm run dev
```

## Framework

This project uses **React**.

## License

MIT
