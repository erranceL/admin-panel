# TurboFlow Soccer Admin Panel

足球 RFQ 管理后台半真实原型。读接口优先直连已有 API，接口不可用或后端缺口模块会降级到演示数据；写接口失败会阻断并显示错误，不会伪造成成功。

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

If `VITE_API_BASE_URL` is empty, local Vite dev proxies `/api` and `/health` to `VITE_API_PROXY_TARGET`.

Do not put production or SIT credentials in any `VITE_*` variable. GitHub Pages is a public demo surface and must not be built with a live writable admin API base.

## GitHub Pages

Pushes to `main` trigger `.github/workflows/deploy.yml`, which runs lint, dependency audit, production build, a dist asset scan, and deploys `dist` to GitHub Pages.

The deployed URL will be:

```text
https://errancel.github.io/admin-panel/
```

In repository settings, set Pages source to `GitHub Actions` if GitHub does not enable it automatically.

The GitHub Pages deployment is intended for mock/demo review only. A real admin panel must be hosted behind VPN/SSO/IP allowlist and backed by server-side authentication, RBAC, and audit logging.

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
