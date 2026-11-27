# Habit Tracker interface

The interface implements a new Google Stitch design for a descriptive public landing page and a separate, action-focused workspace. A deep forest navigation rail anchors warm ivory content, elevated white habit panels, sage activity cells, and restrained terracotta streak indicators. Typography uses Inter throughout the application.

- [Current Google Stitch project](https://stitch.withgoogle.com/projects/1584266915899558638)
- Overview screen: `f1315b71601549a69fca0968fab14c04`
- Landing screen: `ccb3cf4933c44e52beb5b3286f2e948d`
- Shared design system: `assets/9558a5dc1c6f4b3295c64dfcd498191e`
- Generated visual references: `output/stitch-redesign/overview-reference.html` and `output/stitch-redesign/landing-reference.html`
- Production workspace theme: `src/stitch-theme.css`

Generated references are visual guidance only. Production components use account data and supported features; sample identities, fabricated metrics, backup claims, and threshold controls in the generated HTML are not application features.

Earlier product references were [Things](https://culturedcode.com/things/features/) for task hierarchy and breathing room, and [Linear's design process](https://linear.app/now/how-we-redesigned-the-linear-ui) for consistent navigation and alignment.

- [Earlier Stitch project](https://stitch.withgoogle.com/projects/9718232474110878676)
- Dashboard screen: `601b4bc7813543bd89c6300b9d5a0124`
- Insights screen: `e863d389f07c40418b598713707a06d9`
- Shared Stitch design system: `assets/dde6d03b30514a97a9649442f947671b`

The earlier Stitch screens remain historical references. The React workspace uses account data and supported backend actions. The user-supplied inventory dashboard reference informs the current app composition: profile above left navigation, compact account header, four overview tiles, a completion ring and habit list on the left, and a weekly summary column on the right. The forest green and ivory palette and component scrolling are retained.

The public landing page is a project introduction, not an account dashboard. Its product illustrations and captioned animated walkthrough are explicitly labeled and contain no account history or fabricated activity totals. Media source lives in `scripts/build-landing-media.py`, and the playable video, captions, poster, and SVGs live in `public/landing/media/`.

## Foundations

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#F9F7F2` | Warm ivory workspace |
| Surface | `#FFFFFF` | Cards, forms, dialogs |
| Primary | `#1B3B2B` | Navigation, actions, and weekly summary |
| Sage | `#A3C9A8` | Progress and activity highlights |
| Soft primary | `#D9E6DC` | Supporting surfaces |
| Text | `#292D28` | Primary content |
| Muted | `#65705E` | Supporting content |
| Border | `#E5E2DA` | Surface boundaries |

Inter supplies headings, controls, body copy, and data labels across the landing page and app. It is bundled locally through Fontsource, with its notice in `public/licenses/inter.txt`. Base layout lives in `src/index.css`, the current Stitch workspace theme lives in `src/stitch-theme.css`, and landing styles are scoped in `src/landing/landing.css`.

## Interaction principles

- Keep daily check-ins prominent, with progress derived from eligible habits.
- Keep the app shell within the viewport. Page headings and controls stay outside the scrollable content pane; My Habits uses a separately scrollable list under a fixed panel header.
- Keep account access in one shared split frame: an illustrated example on the left, native Log in / Sign up radio controls on the right. Only the field area scrolls; the selector and submit action stay visible. Use the same frame in both modes, collapse the visual on small screens, and scope auth styles against legacy account CSS.
- Bound long calendar lists and expanded report tables. Keep scroll regions keyboard reachable, maintain visible scrollbars, and prevent scroll chaining into the document.
- Use white habit and history panels, a deep green weekly summary, and highlighted report metrics to separate tasks from analysis. Avoid repeating decorative copy inside the workspace.
- Group navigation into daily workspace actions, progress reports, and settings; use the existing modal drawer on smaller screens.
- Show annual check-in density on Overview and Activity. Zero activity is neutral; higher completion counts deepen the green. Clearly distinguish annual totals from streaks across all history.
- Make the landing page explain choosing habits, checking in, and understanding progress through feature descriptions and clearly labeled product media. Never imply the public page knows a visitor's account history.
- Keep backup tools absent from navigation and Settings; retain them at the direct `/pratik` URL behind sign-in.
- Route every successful login or registration to `/app`, including authentication started from `/pratik`. Logout returns to the public landing page; users access testing tools by deliberately opening `/pratik` after sign-in.
- Show sign-up password requirements before submission, update the checklist as users type, and retain existing-password support on login.
- Preserve native form labels, keyboard focus, confirmation dialogs, accessible chart tables, and reduced-motion preferences.
- Keep low, medium, high, unavailable, insufficient-data, and disabled model states distinct.
- Label the coach as a preview and retain its placeholder explanation.
- Treat botanical artwork as decorative; no remote images or generated sample records are required.
- Keep check-in, habit menu, risk disclosure, and account controls at least 44 pixels tall. Adapt habit rows so these targets stay usable on smaller screens.
- Describe reports in terms of saved check-ins, retaining model and coach limitations that affect how users interpret them.

Preserve habit workflows, native forms, confirmation dialogs, API payloads, and backend integration. Public landing, account access, and testing tools have distinct entry URLs. Account dates drive both check-ins and activity summaries.
