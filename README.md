# lucky-wheel 抽奖大屏

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Demo](https://img.shields.io/badge/live-demo-brightgreen.svg)](https://youki258.github.io/lucky-wheel/)
[![Docker Pulls](https://img.shields.io/docker/pulls/youki258/lucky-wheel.svg)](https://github.com/youki258/lucky-wheel/pkgs/container/lucky-wheel)

配置驱动的抽奖大屏系统：**页面上没有任何写死的内容**——标题/文案/奖品/颜色/款式/次数全部在后台或配置文件里改，不碰代码。

## 🚀 在线体验

**交互 Demo（纯前端）：** [youki258.github.io/lucky-wheel](https://youki258.github.io/lucky-wheel/)

- 免登录可玩，管理后台 `/#/admin` 密码 `admin123`
- **数据只存在当前浏览器**（localStorage），换设备/清缓存会丢——和多数开源抽奖站同一套路
- 后台可改标题/奖品/款式/次数，抽奖页即时生效

- 抽奖页 `/#/`：大转盘 / 九宫格 / 老虎机 三种款式，配置即时切换
- 管理后台 `/#/admin`：活动设置、奖品管理、抽奖记录、备份恢复
- 完整版（Docker 自部署）按「剩余份数 × 权重」服务端加权，库存不超发；**抽到即消失**
- 支持限总次数、奖品图片、背景图/渐变、粒子/彩带/音效

<!-- 截图：三种款式 + 后台，录 GIF 后替换此段
<p align="center">
  <img src="docs/screenshot-wheel.gif" width="32%" alt="大转盘" />
  <img src="docs/screenshot-grid.gif" width="32%" alt="九宫格" />
  <img src="docs/screenshot-slot.gif" width="32%" alt="老虎机" />
</p>
-->

## 本地开发

```bash
pnpm install
pnpm dev            # 后端 3001 + 前端热更 5173（/api 自动代理）
pnpm build          # 生产构建 → dist/（不含 demo mock，给 Docker/完整版）
pnpm build:demo     # 交互 Demo 构建（VITE_DEMO，数据存 localStorage）
pnpm preview:demo   # 本地预览 Demo 构建
pnpm start          # 纯后端生产模式（3001 同时托管 dist）
```

默认管理员密码 `admin123`（环境变量 `ADMIN_PASSWORD` 可改）。

## 在线部署

### GitHub Pages（默认，免服务器）

Push `main` 后由 `.github/workflows/deploy-pages.yml` 自动构建发布（`VITE_DEMO=true` + 子路径 `/lucky-wheel/`）。

访问：`https://youki258.github.io/lucky-wheel/`（抽奖与后台均可用，数据仅存当前浏览器）。

### Docker 自部署（完整前后端，可选）

需要**真实服务端加权、多端共享数据、自定义域名**时再用。镜像由 CI 发布到 GHCR（`ghcr.io/youki258/lucky-wheel:latest`），包已 Public，**无需 login**。

```bash
mkdir -p lucky-wheel && cd lucky-wheel
curl -fsSL https://raw.githubusercontent.com/youki258/lucky-wheel/main/docker-compose.yml -o docker-compose.yml
echo 'ADMIN_PASSWORD=你的强密码' > .env
docker compose pull && docker compose up -d
# → http://服务器IP:3001  （前面可加 nginx/caddy 反代 + HTTPS）
```

或有源码时本地构建：

```bash
docker compose up -d --build
```

环境变量（写在 `.env` 里）：

| 变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | `3001` | 宿主机端口 |
| `ADMIN_PASSWORD` | `admin123` | 后台密码，**务必改** |

数据卷 `./data:/app/data`：配置/奖品/记录在宿主机，升级镜像不丢。

```bash
docker compose pull && docker compose up -d   # 更新
docker compose logs -f lucky-wheel            # 日志
docker compose restart                        # 重启
```

> 也提供 [`render.yaml`](render.yaml) 蓝图，可在 Render 等支持 Docker 的 PaaS 一键部署（免费档通常需绑卡，按平台要求操作即可）。

## 数据与备份

**Demo：** 数据在浏览器 localStorage（`lw_demo_*`），后台「备份恢复」可导出/导入 JSON。

**完整版（Docker）：**

| 文件 | 内容 | 修改方式 |
|---|---|---|
| `data/config.json` | 标题/文案/配色/款式/次数上限 | 后台「活动设置」或直接改文件 |
| `data/prizes.json` | 奖品列表（名称/图片/份数/权重/颜色） | 后台「奖品管理」或直接改文件 |
| `data/records.json` | 本轮抽奖记录 | 后台「抽奖记录」导出 CSV / 一键重置 |

- 改 `data/*.json` 后**无需重启**（每次读写都走文件）；不放心就 `docker compose restart`
- 后台「备份恢复」可全量导出/导入 JSON，迁移直接拷 `data/` 目录

## 两种运行模式

| | Demo（GitHub Pages） | 完整版（Docker） |
|---|---|---|
| 后端 | 无，前端 mock | Express |
| 数据 | 浏览器 localStorage | 服务器 `data/*.json` |
| 抽奖 | 前端逻辑 | 服务端加权 + 扣库存 |
| 适用 | 公开预览、单机试玩 | 年会正式用、多端共享 |

## API 契约（前后端只认接口不认内容）

| 接口 | 鉴权 | 说明 |
|---|---|---|
| `GET /api/public` | 公开 | 抽奖页全量数据：config + prizes（含 left 剩余）+ remaining + stockEmpty |
| `POST /api/draw` | 公开 | 抽一次：服务端加权随机、扣库存、写记录；次数用完/库存空返回 409 |
| `POST /api/login` · `POST /api/logout` · `GET /api/session` | 公开 | 管理会话（Cookie `lw_session`） |
| `GET/PUT /api/config` · `GET/PUT /api/prizes` | 管理员 | 活动配置 / 奖品全量替换 |
| `GET /api/records` · `GET /api/records/export.csv` · `POST /api/reset` | 管理员 | 记录 / 导出 / 重置 |
| `POST /api/import` | 管理员 | 全量备份导入 |

## 技术栈

lucky-canvas（转盘/九宫格/老虎机）· Vue3 + Vite + Element Plus · tsParticles + canvas-confetti · Express + JSON 文件存储 · Docker

## License

[Apache-2.0](LICENSE)
