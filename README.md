# Wedding Shower RSVP System

A simple Paperless-Post-style wedding shower RSVP system with SMS invitations and response tracking.

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** Supabase
- **Frontend:** HTML, CSS, vanilla JavaScript
- **SMS:** Twilio

## Features

- **Public RSVP page** (`/rsvp?guest_id=...`) — event title, invite image, YES/NO buttons, confirmation; duplicate responses prevented
- **Unique guest links** — each guest gets a link that ties their response to their record (no login)
- **Guest database** — Supabase table: `id`, `name`, `phone`, `response`, `responded_at`
- **CSV upload** — upload guests (name, phone); records created and unique RSVP links generated
- **SMS invites** — send one SMS per guest with their RSVP link (rate limited to 1/second); success/failure logged
- **Admin dashboard** — protected; list guests, response stats (total / yes / no / not responded), export CSV, upload CSV, send SMS
- **Validation** — phone numbers normalized to E.164; invalid numbers handled on upload

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sender number (e.g. `+1234567890`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon or service role key |
| `ADMIN_SECRET` | Secret for admin dashboard (use a long random string) |
| `BASE_URL` | Base URL for RSVP links in SMS (e.g. `https://your-app.com` or ngrok URL for local testing) |

### 3. Create Supabase table

In the [Supabase SQL Editor](https://supabase.com/dashboard), run the schema:

```bash
# Or paste contents of:
cat supabase/schema.sql
```

Creates table `guests` with: `id` (uuid), `name`, `phone`, `response` ('yes'|'no'|null), `responded_at`, `created_at`, `updated_at`.

### 4. Invite image (optional)

Place your Canva invite image at:

```
public/images/invite.jpg
```

If the file is missing, the RSVP page still works; the image area is hidden.

### 5. Run locally

```bash
npm start
```

- App: http://localhost:3000  
- RSVP: http://localhost:3000/rsvp  
- Admin: http://localhost:3000/admin  

For local SMS testing, set `BASE_URL` to an ngrok (or similar) URL so RSVP links in texts are clickable.

## Usage

1. **Admin:** Open `/admin`. Enter your `ADMIN_SECRET` when prompted (or use `?admin_key=YOUR_SECRET` in the URL).
2. **Upload guests:** Use “Upload guests (CSV)”. CSV must have columns `name` and `phone` (or `Phone` / `phone_number`). Phones are normalized to E.164.
3. **Send invites:** Optionally change the event title, then click “Send invites”. One SMS per guest with their unique link; sent at 1 per second.
4. **Guests:** Click their link (e.g. `/rsvp?guest_id=uuid`) and choose YES or NO. They see a confirmation; repeat submissions are blocked.
5. **Export:** Use “Export CSV” to download all guests and responses.

## Project structure

```
├── server.js                 # Express app entry
├── .env.example
├── supabase/
│   └── schema.sql           # Guests table
├── public/
│   ├── rsvp.html             # RSVP page
│   ├── admin.html            # Admin dashboard
│   ├── css/style.css
│   ├── js/rsvp.js
│   ├── js/admin.js
│   └── images/
│       └── invite.jpg        # Your Canva image
└── src/
    ├── config/supabase.js
    ├── middleware/adminAuth.js
    ├── routes/
    │   ├── rsvp.js           # GET guest, POST submit
    │   ├── admin.js          # GET guests, stats, export
    │   └── guests.js         # POST upload, send-invites
    ├── services/smsSender.js # Twilio rate-limited send
    └── utils/phone.js        # E.164 normalization
```

## License

MIT
