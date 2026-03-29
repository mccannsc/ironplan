# IronPlan

Smart workout tracking with progressive overload.

## Deploy to Vercel

### 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** and run the contents of `supabase/schema.sql`
3. In **Authentication → Users**, create your account (or use the app's sign-in form once deployed)
4. Copy your **Project URL** and **anon public key** from **Settings → API**

### 2. Update credentials

Edit `js/config.js`:

```js
export const SUPABASE_URL = 'https://your-project.supabase.co';
export const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 3. Deploy

1. Push the project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo
3. No build command needed — Vercel will serve the static files directly
4. Click **Deploy**

### Local development

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Tech stack

- Vanilla JS (ES modules, no build step)
- Supabase (auth + PostgreSQL)
- CSS custom properties, dark theme
- PWA manifest + mobile-first layout
