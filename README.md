# Band HQ

Band HQ is a dynamic website for organizing rehearsals, performances, and band operations in one place.

Google Drive is not the system of record. It is only used for media links (audio, video, charts, photos, etc.).

## Vision

Build a lightweight internal app where band members can:
- Plan rehearsals and gigs
- Track setlists and song readiness
- Assign tasks and logistics
- Store notes and decisions
- Attach Google Drive links to media when needed

## Core Product Scope

### Rehearsals
- Create rehearsal sessions with date, location, and agenda
- Add attendance and notes
- Link each rehearsal to songs worked on

### Performances
- Create gig entries with venue, call times, and contacts
- Track status (planned, confirmed, completed)
- Attach setlist versions and post-show notes

### Songs and Setlists
- Maintain a song catalog (originals and covers)
- Track song readiness and key notes
- Build and version setlists per performance

### Media Links (Google Drive)
- Attach Drive URLs to songs, rehearsals, and performances
- Examples: demos, stems, rehearsal videos, charts, promo assets
- No requirement to sync or mirror Drive folder structure

## Suggested MVP Data Model

- BandMember
- Song
- Setlist
- Rehearsal
- Performance
- Task
- MediaLink (URL + label + linked entity)

## Hosting: GitHub Pages?

Short answer: yes, if your app is frontend-only or uses an external backend.

GitHub Pages is a good fit when:
- You deploy a static SPA (React/Vite, Vue, Svelte, etc.)
- Data comes from a hosted backend (Supabase, Firebase, Appwrite, custom API)
- You do not need server code running inside the same host

GitHub Pages is not a good fit when:
- You need server-side logic hosted with the app
- You need private/authenticated backend endpoints on the same platform
- You require background jobs, webhooks, or persistent server processes

## Practical Recommendation

For this project:
1. Host the frontend on Vercel
2. Use Supabase (or Firebase) for auth + database + storage metadata
3. Store only Google Drive URLs in your app records for media references

This keeps costs low, deployment simple, and the architecture ready to scale beyond docs.

## Run Locally

Requirements:
- Node.js 18+

Commands:
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill Supabase values
3. Create tables by running `supabase/schema.sql` in the Supabase SQL editor
4. `npm run dev`
5. Open the local URL shown by Vite

## Deploy On Vercel

1. Push this repo to GitHub
2. In Vercel, click New Project and import this repo
3. Add env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. Keep defaults (Vite is auto-detected)
5. Deploy

Vercel build settings (default):
- Build command: `npm run build`
- Output directory: `dist`

## Database Setup (Supabase)

Use the SQL in `supabase/schema.sql` to create the first two tables:
- `rehearsals`
- `performances`
- `band_members`
- `member_song_lists`
- `rehearsal_song_requests`
- `request_approvals`

Current app capabilities:
- Dark theme workspace
- Create rehearsal entries
- Create a member folder and nested categories: covers, originals, songs_im_learning
- Edit song lists inside each member folder
- Request songs for upcoming rehearsals
- Approve or reject requests by different band members (2 approvals marks approved)

Security note:
- The starter SQL uses open RLS policies for fast setup. Restrict these policies once you add authentication.