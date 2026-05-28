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
VITE_API_BASE_URL=https://surfv2-sit-api.nfexinsider.com
VITE_ENABLE_ADMIN_WRITES=true
VITE_ALLOW_MOCK_RECHARGE=true
```

If `VITE_API_BASE_URL` is empty, local Vite dev proxies `/api` and `/health` to `VITE_API_PROXY_TARGET`.

`VITE_API_BASE_URL` must be the API origin only, not a full endpoint path. For example, the SIT endpoint `https://surfv2-sit-api.nfexinsider.com/api/v1/soccer/rfq/trade` maps to `VITE_API_BASE_URL=https://surfv2-sit-api.nfexinsider.com`.

Do not put production or SIT credentials in any `VITE_*` variable because browser builds expose them. Admin writes are disabled unless `VITE_ENABLE_ADMIN_WRITES=true`; mock recharge is separately gated by `VITE_ALLOW_MOCK_RECHARGE=true`.

## GitHub Pages

Pushes to `main` trigger `.github/workflows/deploy.yml`, which runs lint, dependency audit, production build, a dist asset scan, and deploys `dist` to GitHub Pages.

The deployed URL will be:

```text
https://errancel.github.io/admin-panel/
```

In repository settings, set Pages source to `GitHub Actions` if GitHub does not enable it automatically.

The GitHub Pages deployment is configured as a private SIT demo and points to `https://surfv2-sit-api.nfexinsider.com`. A real production admin panel must be hosted behind VPN/SSO/IP allowlist and backed by server-side authentication, RBAC, and audit logging.

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
