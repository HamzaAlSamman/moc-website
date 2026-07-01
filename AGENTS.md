<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Plesk deployment package

When the user asks to "save/upload/deploy to Plesk", create a ZIP named `moc-update.zip` for code only.

- Include: `src`, `public` except uploads, `prisma`, `scripts`, `design-system`, `package.json`, `package-lock.json`, `next.config.mjs`, `postcss.config.mjs`, `jsconfig.json`, `README.md`, and `AGENTS.md`.
- Exclude: `public/uploads`, `public/uploads.zip`, `node_modules`, `.next`, `.env*`, `.codegraph`, database dumps, existing ZIP files, and local/temp backup folders.
- After creating the ZIP, verify that it contains no uploads, no environment files, no build output, and no dependencies.
- Provide these SSH commands for the server after uploading `moc-update.zip` to `/var/www/vhosts/moc.gov.sy/httpdocs/next-app`:

```bash
pm2 stop moc-next
cd /var/www/vhosts/moc.gov.sy/httpdocs/next-app
unzip -o moc-update.zip
npm install
npx prisma generate
NODE_OPTIONS="--max-old-space-size=1024" npm run build
pm2 restart moc-next --update-env
```
