# TurboFlow Soccer Admin Panel

足球 RFQ 管理后台半真实原型。页面优先直连 SIT 已有 API，接口不可用或后端缺口模块会自动降级到 mock 数据，并在页面上标记 `Real API` / `Mock fallback`。

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4, aligned with the main TurboFlow frontend visual tokens
- React Router
- Native fetch API client with response envelope support

## API

Create `.env.local` from `.env.example` when needed:

```bash
VITE_API_BASE_URL=http://localhost:8080
```

If `VITE_API_BASE_URL` is empty, Vite proxies `/api` and `/health` to `VITE_API_PROXY_TARGET`.

## GitHub Pages

Pushes to `main` trigger `.github/workflows/deploy.yml`, which runs lint, builds the Vite app, and deploys `dist` to GitHub Pages.

The deployed URL will be:

```text
https://errancel.github.io/admin-panel/
```

In repository settings, set Pages source to `GitHub Actions` if GitHub does not enable it automatically.

## Modules

- Dashboard
- RFQ operations
- Oracle arbitration
- Polymarket governance
- User/account operations
- Distributor markup
- Ops monitoring
- Rebate
- KPI reports
- RBAC/audit

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```
