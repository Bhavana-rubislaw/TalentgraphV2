TalentGraph V2 — Design System Research Report
1. Styling Approach
The project has no CSS framework, CSS-in-JS library, or UI component library. It's two separate Vite/React/TypeScript SPAs, each using plain hand-written CSS files imported directly into page/component .tsx files:

frontend2/ — main app (frontend2/package.json). Dependencies: react, react-router-dom, zustand, framer-motion, axios, date-fns. No Tailwind, no MUI/Chakra, no styled-components, no CSS Modules (files are plain .css, imported globally, not *.module.css).
admin-ui/ — separate admin portal (admin-ui/package.json). Same plain-CSS approach, plus recharts.
There is no tailwind.config.* or theme.ts/theme.js anywhere in the repo. Styling is done via:

One global :root CSS-variable design system per app (frontend2/src/index.css, admin-ui/src/index.css).
~24 additional per-feature CSS files in frontend2/src/styles/ (loaded ad hoc per page/component), totaling ~25,000 lines.
Inline styles in some components (e.g. frontend2/src/components/dashboard/Buttons.tsx).
Both apps use Google Fonts Inter loaded via @import url(...) at the top of their respective index.css.

2. Landing Page — Location, CSS/Theme Values
Component: frontend2/src/pages/LandingPage.tsx
Route: / (also /landing → redirects to /) — frontend2/src/App.tsx:234-237
Stylesheet: frontend2/src/styles/Landing.css (794 lines), imported at LandingPage.tsx:4
The landing page defines its own scoped CSS-variable palette on the .tg-landing wrapper class (Landing.css:5-26), completely independent of the app-wide index.css variables:

.tg-landing {
  --tg-blue: #2563eb;
  --tg-blue-dark: #1d4ed8;
  --tg-blue-light: #eff6ff;
  --tg-navy: #0f172a;
  --tg-navy-2: #0b1220;
  --tg-text: #0f172a;
  --tg-muted: #64748b;
  --tg-muted-light: #94a3b8;
  --tg-border: #e5e7eb;
  --tg-bg-soft: #f8fafc;
  --tg-purple: #7c3aed;   /* used only as an accent icon color, not the brand color */
  --tg-green: #16a34a;
  --tg-orange: #ea580c;
  --tg-red: #dc2626;
  --tg-cyan: #0891b2;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #fff;
}
Key design characteristics:

Primary brand color is blue (--tg-blue: #2563eb), not purple — buttons, nav highlights, links, section eyebrows all use blue.
Background is white/soft-gray (--tg-bg-soft: #f8fafc), with a dotted radial-gradient pattern behind the hero (Landing.css:172-178).
Border radius conventions: buttons 10px (.tg-btn), cards 16px.
Sections use generous padding (88px 24px — Landing.css:33).
Font: Inter (matches app-wide font, so typography family is consistent).
No purple gradient branding is used as the primary identity here — purple (#7c3aed) appears only as one of several accent "icon" colors (.tg-icon-purple, Landing.css:509).
SignInPage.tsx and SignUpPage.tsx (frontend2/src/pages/SignInPage.tsx, SignUpPage.tsx) both import Landing.css + Auth.css and wrap content in <div className="tg-landing tg-auth">, so they do share the landing's blue/navy token system. Auth.css even states in its header comment: "Shares design tokens with Landing.css via the .tg-landing wrapper class."

3. Other Pages — File Locations
All under frontend2/src/pages/ (routes defined in frontend2/src/App.tsx:234-431):

Page	File	Route
Sign In	SignInPage.tsx	/signin
Sign Up	SignUpPage.tsx	/signup
Accept Invite	AcceptInvitePage.tsx	/accept-invite
Company Profile Setup	CompanyProfileSetupPage.tsx	/company-profile-setup
Candidate Profile Setup	CandidateProfileSetupPage.tsx	/candidate-profile-setup
Recruiter Dashboard	RecruiterDashboardNew.tsx	/recruiter-dashboard, /recruiter/dashboard
HR Dashboard	HRDashboard.tsx	/hr/dashboard
Candidate Dashboard	CandidateDashboardNew.tsx	/candidate-dashboard
Recruiter Profile	RecruiterProfilePage.tsx	/recruiter/profile
Job Posting Builder/Form	JobPostingBuilder.tsx, JobPostingForm.tsx	/recruiter/job-posting, /recruiter/job-postings
Meetings	MeetingsPage.tsx	/meetings
Calendar Settings	CalendarSettingsPage.tsx	/settings/calendar
Welcome	WelcomePage.tsx	/welcome
Candidate Profile / Job Prefs	CandidateProfilePage.tsx, JobPreferencesPage.tsx	/candidate/profile, /candidate/job-preferences
Messages (candidate/recruiter/hr)	MessagesPage.tsx	/candidate/messages, /recruiter/messages, /hr/messages
Subscription	SubscriptionPage.tsx	(not wired into visible routes list found, check further)
Logging Dashboard	LoggingDashboard.tsx	(internal/dev)
Separate admin app: admin-ui/src/pages/ — DashboardPage.tsx, UsersPage.tsx, CompaniesPage.tsx, ApplicationsPage.tsx, JobPostingsPage.tsx, JobPreferencesPage.tsx, AnalyticsPage.tsx, TaxonomyPage.tsx, AlgorithmPage.tsx, EmailLogsPage.tsx, LogsPage.tsx, LoginPage.tsx, plus shared admin-ui/src/components/AdminLayout.tsx.

4. Styling Divergence Per Page Type
Page(s)	CSS file(s) imported	Palette basis	Differs from Landing how
SignIn/SignUp	Landing.css + Auth.css	.tg-landing blue/navy tokens	Matches landing (intentionally shared)
Candidate/Recruiter/HR Dashboards (CandidateDashboardNew.tsx, RecruiterDashboardNew.tsx, HRDashboard.tsx)	ModernDashboard.css, PremiumDashboard.css, PremiumDashboardV2.css, PremiumCards.css, PremiumModals.css	App-wide purple gradient system from index.css (--purple-500: #764ba2, --gradient-primary: #667eea→#764ba2), plus hardcoded hex like #F5F6FA (bg) and #6C5CE7/#764ba2 gradients repeated directly in CSS instead of via var()	Completely different hue family (purple vs. landing's blue); different background (#F5F6FA cool gray vs. landing's white); large glassmorphism/shadow-heavy dashboard shell not present on landing
Dashboard.css (legacy/general dashboard)	Purple gradient header text (linear-gradient(135deg, #6C5CE7 0%, #764ba2 100%)), #F5F6FA bg, hardcoded #E4E7EC borders	Purple, not blue	Same family issue as above
HR tab panels (HRDashboard.css)	Hardcoded #1f2937 text color, no CSS variables at all — plain hex	Neutral gray, doesn't reference either brand palette explicitly	Not tied to any shared token system
Candidate onboarding pages (CandidateProfileSetupPage.tsx, CompanyProfileSetupPage.tsx)	CandidatePages.css (4,124 lines)	Third, separate palette scoped under its own --cp-* variables: --cp-accent: #6C5CE7 (a purple/indigo, close to but distinct from --purple-500), --cp-bg: #F5F6FA, --cp-success: #2ECC71, --cp-danger: #E74C3C, --cp-warning: #F0A830	Yet another independent token namespace, not reusing index.css vars or Landing.css vars; own font var --cp-font
Job Posting Builder	JobPostingBuilder.css (1,344 lines)	Own jpb-* prefixed classes	Independent styling, not confirmed to reuse global tokens
Messages, Meetings, Notifications, Chat	MessagesPage.css, MeetingsPanel.css, NotificationPanel.css, NotificationPopup.css, NotificationPreferences.css, ChatWindow.css	Mostly reference index.css purple vars/shadows for cards, mixed with local hex values	Generally purple-family, but inconsistent variable usage (sometimes var(--purple-500), sometimes literal hex)
Welcome page	Form.css	Generic form styling, purple accents via index.css .btn-primary etc.	Purple family again
Net finding: the app effectively has three parallel color systems in frontend2/src:

Blue/navy .tg-landing system (Landing + Auth pages) — Landing.css:6-20
App-wide purple :root system in index.css (used loosely, with heavy hardcoded-hex duplication, by dashboards, forms, notifications) — index.css:8-25
A third --cp-* purple/indigo variant scoped to CandidatePages.css:9-28, close to but not identical to system 2's purple (#6C5CE7 vs #764ba2)
The admin-ui app (admin-ui/src/index.css:11-41) deliberately mirrors system 2 (purple gradient) and documents this in a comment, so admin and dashboards are reasonably aligned with each other — it's specifically the landing/auth pages vs. everything else that diverge in hue (blue vs. purple) and in background treatment (white vs. gray-canvas --bg-app: #f5f6fa).

5. Existing Shared/Global Theme Infrastructure
Yes — there's a substantial, well-structured global theme already in frontend2/src/index.css (149-line :root block, lines 1-149) covering:

Gradients: --gradient-primary, --gradient-accent, --gradient-subtle, --gradient-highlight
Purple scale: --purple-50 … --purple-900
Background layers: --bg-app, --bg-canvas, --bg-surface, --bg-elevated, --bg-sidebar, --bg-section, --bg-subtle
Borders, text hierarchy, semantic colors (success/warning/error/info), a full shadow scale (including purple-tinted shadows), 8px spacing scale, radius scale, type scale, font-weight scale, line-heights, transitions, z-index scale.
Reusable utility classes: .btn/.btn-primary/secondary/ghost/success/danger/warning, .card, .page-container, .page-header, .form-input, badges, spinner, a large set of flex/grid/spacing/text utility classes (lines 237-1133).
This is a legitimately solid design-token foundation — but it is only consumed by the dashboard/app-shell pages, not by the landing/auth pages, which define and use their own separate --tg-* tokens in Landing.css instead. So the infrastructure to unify things largely already exists in index.css; the landing page just isn't plugged into it (and conversely, many dashboard CSS files re-hardcode hex values like #667eea, #764ba2, #F5F6FA, #E4E7EC instead of consistently using the var(--...) tokens that already exist for them).

admin-ui/src/index.css (separate app) has its own near-duplicate copy of the same purple system plus admin-specific sidebar tokens — not literally shared/imported from frontend2, just copy-pasted/kept in sync manually.

No theme.ts/theme.js/design-tokens JSON file exists — everything is CSS custom properties in the two index.css files.

6. Shared Component Library / Reused UI Components
Partial reuse, not consistent:

frontend2/src/components/dashboard/ is a small shared kit used by the three main dashboards (Buttons.tsx, DashboardHero.tsx, DashboardShell.tsx, DashboardSidebar.tsx, EmptyState.tsx, EntityCard.tsx, FilterToolbar.tsx, exported via index.ts). Buttons.tsx uses inline styles referencing var(--text-secondary, #64748b) (i.e., falls back to the landing's muted-gray hex if the CSS var isn't present — an example of the token drift).
frontend2/src/components/common/ contains only DetailDrawer.tsx — essentially no general-purpose shared UI primitives (no shared Button, Card, Input, Modal component files; those are done via CSS classes like .btn, .card, .form-input from index.css, or bespoke per-feature classes like .tg-btn, .jpb-*, .cp-*).
Feature areas each largely reinvent their own component + CSS pairing: components/hr/, components/recruiter/, components/candidate/, components/meetings/, components/notifications/, components/jobPostingBuilder/, components/interviews/, components/settings/, components/swipe/, components/chat/ — each has its own components and (mostly) dedicated CSS files in frontend2/src/styles/ rather than composing from a shared primitive set.
Landing/Auth pages use zero shared React components from components/dashboard or components/common — they're built from scratch with plain <div>s and tg-* classes directly in LandingPage.tsx/SignInPage.tsx/SignUpPage.tsx.
admin-ui has its own separate AdminLayout.tsx, ConfirmDialog.tsx, Icons.tsx — no code sharing with frontend2 (separate app, separate node_modules, no shared package/workspace).
Summary for Planning
To unify design across the app you'd primarily need to:

Decide on one canonical brand palette — likely the purple gradient system already fully built out in index.css (--gradient-primary, --purple-* scale), since it's the more complete token system and already used (loosely) by the majority of pages, OR migrate everything to the landing's blue if that's the preferred brand direction.
Rework Landing.css (and Auth.css) to stop defining --tg-* tokens and instead consume the shared index.css :root variables, OR merge --tg-* into index.css as the single source of truth.
Reconcile the third palette in CandidatePages.css (--cp-*, especially --cp-accent: #6C5CE7 vs. --purple-500: #764ba2) into the same shared tokens.
Sweep dashboard CSS files (Dashboard.css, HRDashboard.css, PremiumDashboard.css, ModernDashboard.css, etc.) to replace hardcoded hex (#667eea, #764ba2, #F5F6FA, #E4E7EC, #1f2937, etc.) with the existing var(--...) equivalents for consistency and easier future theming.
Consider extracting a genuine shared component set (Button, Card, Input, Modal) into components/common/ used by both landing/auth and dashboard/app pages, since currently only components/dashboard/ is reused and landing/auth are fully isolated.
admin-ui is a separate Vite app with its own copy of the purple theme — decide whether to keep it as a manually-synced duplicate or formalize a shared tokens file/package between frontend2 and admin-ui.