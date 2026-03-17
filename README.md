# ETH CC — CBO Briefing Submissions

Internal tool for GTM leads to submit executive briefing data for Johann Eid's meetings at ETH CC.

## Quick Deploy (5 minutes)

### Prerequisites
- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account (free, sign up with GitHub)

### Step 1: Push to GitHub

```bash
# If you have git installed locally:
cd eth-cc-briefings
git init
git add .
git commit -m "ETH CC briefing tool"

# Create a new repo on GitHub (github.com/new), then:
git remote add origin https://github.com/YOUR_USERNAME/eth-cc-briefings.git
git branch -M main
git push -u origin main
```

Or just drag-and-drop the folder contents into a new GitHub repo via the web UI.

### Step 2: Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import** next to your `eth-cc-briefings` repo
3. Leave all defaults as-is — Vercel auto-detects Next.js
4. Click **Deploy**
5. In ~60 seconds you'll have a live URL like `eth-cc-briefings.vercel.app`

### Step 3: Share

Send the Vercel URL to your GTM leads. They open it, filter by their name, click into each meeting, and fill out the briefing fields.

## How It Works

- **31 meetings** pre-loaded from the ETH CC tracker, stack-ranked P0 → P1 → P2
- **Status indicators**: Green = CBO confirmed, Yellow = awaiting confirmation
- **Required fields**: Account Context, What They Care About, Meeting Objectives
- **New fields**: Use Case for CRE (Yes/No toggle), Other Products (text)
- **Data storage**: localStorage in each user's browser

## Important Notes

- Data is stored **locally in each person's browser** — they won't see each other's submissions
- To collect all submissions, ask each lead to copy/paste or screenshot their completed forms
- Alternatively, you can add a backend (Firebase, Supabase, Google Sheets API) for centralized storage

## Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Project Structure

```
app/
  layout.js    — Root layout, fonts, metadata
  globals.css  — All styling
  page.js      — Main app component (list + form views)
  data.js      — Meeting data from tracker
```
