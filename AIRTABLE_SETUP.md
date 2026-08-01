# Airtable Setup for AI Tutor Machine

Your Airtable base needs **Winners** and **Queue** tables. Growth features add a few Queue fields for Reels and carousels.

## 1. Create "Winners" Table

Fields:

| Field | Type | Notes |
|-------|------|--------|
| Post URL | Single line text | Instagram post URL |
| Account | Single line text | Source username |
| Caption | Long text | Original caption |
| Likes | Number | |
| Comments | Number | |
| Status | Single select | `New`, `Used` |
| Format | Single line text | Optional — Image / Video / Sidecar |
| Growth Score | Number | Optional — set by research cron |

## 2. Create "Queue" Table

Fields:

| Field | Type | Notes |
|-------|------|--------|
| Hook | Single line text | Headline |
| Caption | Long text | Full caption |
| Image URL | URL | Cover / feed image |
| Status | Single select | `Ready`, `Posted` |
| Source URL | URL | Original winner URL |
| Posted At | Single line text | ISO timestamp |
| **Type** | Single select | `Feed`, `Reel`, `Carousel` — **required for growth** |
| **Video URL** | URL | Reel MP4 public URL |
| **Cover URL** | URL | Reel cover image |
| **First Comment** | Long text | Auto-posted after publish (CTAs + hashtags) |
| **Slide URLs** | Long text | JSON array of carousel image URLs |

### Quick add (growth fields)

If Queue already exists, add:

1. `Type` — single select with options: Feed, Reel, Carousel  
2. `Video URL` — URL  
3. `Cover URL` — URL  
4. `First Comment` — long text  
5. `Slide URLs` — long text  

Without these, feed posts still work; Reels and carousels will error with a clear setup message.

## How content flows

1. **Research** (Mondays) → Winners (`Status=New`), scored for comments + video/carousel bias  
2. **Generate feed** (daily) → Queue `Type=Feed`  
3. **Generate reel** (daily) → Queue `Type=Reel` + Video URL  
4. **Generate carousel** (Tue/Thu/Sat) → Queue `Type=Carousel` + Slide URLs  
5. **Post** (daily 15:00 UTC) → publishes Feed/Carousel + first comment  
6. **Post reel** (daily 18:00 UTC) → publishes Reel + first comment  

## Testing

1. Open your Vercel dashboard URL  
2. Trigger Research → check Winners  
3. Trigger Generate Reel → check Queue for `Type=Reel` and a Video URL  
4. Trigger Post Reel → check Instagram Reels tab  

## Troubleshooting

**"Airtable Queue is missing growth fields"**  
→ Add Type / Video URL / Cover URL / First Comment / Slide URLs as above.

**"Airtable list failed: 404"**  
→ Table names must be exactly `Winners` and `Queue`.

**Veo / reel generate fails**  
→ Gemini key needs paid Veo access. See README growth section.
