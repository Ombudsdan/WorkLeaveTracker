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

| Variable          | Description                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `NEXTAUTH_URL`    | The canonical URL of your site (e.g. `http://localhost:3000` for local dev)                                             |
| `NEXTAUTH_SECRET` | A secret used to sign/encrypt NextAuth tokens. **Required in production.** Generate one with `openssl rand -base64 32`. |

## Data Storage

User data (accounts, leave entries, allowances) is stored in a local JSON file at `data/data.json`.

### Local development

When running locally, `data/data.json` is read from and written to on every API request. The file is **gitignored** — on a fresh clone, `data/data.example.json` is automatically copied to `data/data.json` on the first API call. You can edit `data.example.json` to seed different demo data.

### Deployed to Vercel

Vercel's serverless functions run in a **read-only filesystem** except for `/tmp`. On deployment, data is stored at `/tmp/data.json`. Because `/tmp` is **ephemeral** (it's wiped on cold starts and is not shared between function instances), any data you save will be lost when the Lambda restarts. This means:

- You may need to re-register your account after a deployment or cold start.
- Data is **not** persisted across restarts on Vercel with this setup.

This is intentional for the current stage of development. The plan is to swap the `data/db.ts` file-based layer for a free external database service (e.g. PlanetScale, Supabase, or MongoDB Atlas) before the application is used in production. Once a real database is connected, all data will be persistent regardless of environment.

> **Note:** `data.json` is gitignored so your personal data is never committed to the repository. Only `data.example.json` (containing demo users) is tracked in version control.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Before deploying, make sure to set the required environment variables in your Vercel project settings:

- `NEXTAUTH_SECRET` – generate a strong secret with `openssl rand -base64 32`
- `NEXTAUTH_URL` – set to your production URL (e.g. `https://your-app.vercel.app`)

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
