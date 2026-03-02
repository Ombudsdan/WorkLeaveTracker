This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Environment Variables

Create a `.env.local` file in the project root based on `.env.example`. The following variables are required:

| Variable            | Description                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `NEXTAUTH_URL`      | The canonical URL of your site (e.g. `http://localhost:3000` for local dev)                                             |
| `NEXTAUTH_SECRET`   | A secret used to sign/encrypt NextAuth tokens. **Required in production.** Generate one with `openssl rand -base64 32`. |
| `KV_REST_API_URL`   | Vercel KV REST endpoint. Set automatically when you link a KV store in the Vercel dashboard. Leave blank for local dev. |
| `KV_REST_API_TOKEN` | Vercel KV REST token. Set automatically when you link a KV store in the Vercel dashboard. Leave blank for local dev.    |

> **Note on prefixed env vars:** When you connect a Vercel KV store that has a
> custom name (e.g. **LEAVE_TRACKER_STORAGE**), Vercel creates prefixed
> variables such as `LEAVE_TRACKER_STORAGE_KV_REST_API_URL` and
> `LEAVE_TRACKER_STORAGE_KV_REST_API_TOKEN` instead of the standard names
> above. The app automatically detects and uses these prefixed variables, so no
> manual renaming is needed.

## Data Storage

User data (accounts, leave entries, allowances) is stored differently depending on the environment.

### Local development

When `KV_REST_API_URL` / `KV_REST_API_TOKEN` are **not** set, the app falls back to a local JSON file at `data/data.json`. The file is **gitignored** — on a fresh clone, `data/data.example.json` is automatically copied to `data/data.json` on the first API call. You can edit `data.example.json` to seed different demo data.

### Deployed to Vercel

The app uses **Vercel KV** (powered by Upstash Redis) for persistent storage. Data is shared across all serverless function instances and survives deployments and cold starts.

To enable Vercel KV:

1. Open your project in the [Vercel dashboard](https://vercel.com/dashboard).
2. Go to the **Storage** tab and click **Create Database → KV**.
3. Follow the prompts to create a free KV store and connect it to your project.
4. Vercel automatically adds KV credentials to your project's environment variables. **No manual copying needed.**
   - If you accepted the default name the variables will be `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
   - If you gave the store a custom name (e.g. **LEAVE_TRACKER_STORAGE**) the variables will be prefixed accordingly (e.g. `LEAVE_TRACKER_STORAGE_KV_REST_API_URL` / `LEAVE_TRACKER_STORAGE_KV_REST_API_TOKEN`). The app handles both automatically.
5. Re-deploy (or trigger a new deployment) — the app will now read and write all user data from KV.

> **Note:** `data.json` is gitignored so your personal data is never committed to the repository. Only `data.example.json` (containing demo users) is tracked in version control.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Before deploying, make sure to set the required environment variables in your Vercel project settings:

- `NEXTAUTH_SECRET` – generate a strong secret with `openssl rand -base64 32`
- `NEXTAUTH_URL` – set to your production URL (e.g. `https://your-app.vercel.app`)

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
