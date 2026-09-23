# lucky-wheel 抽奖大屏

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Demo](https://img.shields.io/badge/live-demo-brightgreen.svg)](https://youki258.github.io/lucky-wheel/)
[![Docker Pulls](https://img.shields.io/docker/pulls/youki258/lucky-wheel.svg)](https://github.com/youki258/lucky-wheel/pkgs/container/lucky-wheel)

配置驱动的抽奖大屏系统：**页面上没有任何写死的内容**——标题/文案/奖品/颜色/款式/次数全部在后台或配置文件里改，不碰代码。

## 🚀 在线体验

| 入口 | 地址 | 说明 |
|---|---|---|
| **交互 Demo** | [youki258.github.io/lucky-wheel](https://youki258.github.io/lucky-wheel/) | 纯前端 + 本地 mock，免登录可玩；后台密码 `admin123`，数据存浏览器 |
| **完整实例** | [lucky-wheel.youki.fun](https://lucky-wheel.youki.fun) | 真实前后端（Render 免费档），含管理后台；闲置休眠，首次打开稍慢 |

- 抽奖页 `/#/`：大转盘 / 九宫格 / 老虎机 三种款式，配置即时切换
- 管理后台 `/#/admin`：活动设置、奖品管理、抽奖记录、备份恢复
- 服务端按「剩余份数 × 权重」加权随机，库存不超发；**抽到即消失**（某奖品剩余归零后从盘面移除）
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
pnpm build          # 生产构建 → dist/（不含 demo mock）
pnpm build:demo     # 交互 Demo 构建（VITE_DEMO，数据存 localStorage）
pnpm preview:demo   # 本地预览 Demo 构建
pnpm start          # 纯后端生产模式（3001 同时托管 dist）
```

默认管理员密码 `admin123`（环境变量 `ADMIN_PASSWORD` 可改）。

## 在线部署

### GitHub Pages（交互 Demo）

Push `main` 后由 `.github/workflows/deploy-pages.yml` 自动构建并发布（`VITE_DEMO=true` + 子路径 `/lucky-wheel/`）。

一次性设置：仓库 **Settings → Pages → Source** 选 **GitHub Actions**。

访问：`https://youki258.github.io/lucky-wheel/`（抽奖与后台均可用，数据仅存当前浏览器）。

### Render（完整实例 + 自定义域名）

仓库已含 [`render.yaml`](render.yaml)，推荐用 Blueprint：

1. Render → **New + → Blueprint** → 连接本仓库
2. 环境变量 `ADMIN_PASSWORD` 填强密码（`sync: false`，部署时填）
3. 等待 Docker 构建完成，得到 `https://xxx.onrender.com`
4. **Settings → Custom Domains → Add** → 输入 `lucky-wheel.youki.fun`
5. 在你的 DNS 服务商加一条（**不要加 AAAA**）：
   - 类型 `CNAME`，名称 `lucky-wheel`，值 `<服务名>.onrender.com`，TTL 1 分钟
6. 回 Render 点验证，HTTPS 证书自动签发

也可手动 **New + → Web Service** → Docker，效果相同。

> 免费档：512MB / 闲置约 15 分钟休眠 / 磁盘临时——**重新部署或实例回收后数据会重置**（后台「重置本轮」可恢复种子数据）。国内访问欧美源站可能较慢，属平台网络状况，与自定义域名无关。

### Docker（自有服务器）

镜像由 GitHub Actions 自动构建并发布到 GHCR（`ghcr.io/youki258/lucky-wheel:latest`），推代码即构建；仓库/包设为 Public 后无需登录即可拉取。

### 部署到服务器（ssh az）

镜像方式（推荐，服务器不用装 Node）：

```bash
# 1. 服务器上登录 GHCR（首次；PAT 需勾选 read:packages 权限）
echo 你的PAT | docker login ghcr.io -u youki258 --password-stdin

# 2. 拉镜像 + 启动
ssh az -t "mkdir -p ~/lucky-wheel && cd ~/lucky-wheel \\
  && [ -f docker-compose.yml ] || curl -fsSL https://raw.githubusercontent.com/youki258/lucky-wheel/main/docker-compose.yml -o docker-compose.yml \\
  && echo 'ADMIN_PASSWORD=你的密码' > .env \\
  && docker compose pull && docker compose up -d"

# 3. HTTPS 反代（nginx/caddy 指向 127.0.0.1:3001）
```

或 rsync 源码现场构建（不依赖 GHCR 登录）：

```bash
rsync -av --exclude node_modules --exclude data --exclude .git ./ az:~/lucky-wheel/
ssh az -t "cd ~/lucky-wheel && ADMIN_PASSWORD=你的密码 docker compose up -d --build"
```

环境变量（写在服务器上的 `.env` 里）：

| 变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | `3001` | 宿主机映射端口（容器内固定 3001） |
| `ADMIN_PASSWORD` | `admin123` | 后台密码，**部署时务必改** |

数据卷 `./data:/app/data`：全部活动数据都在宿主机 `data/` 目录，升级/重建镜像不丢数据（已验证容器销毁重建记录仍在）。

常用命令：

```bash
docker compose pull && docker compose up -d   # 更新到最新镜像
docker compose logs -f lucky-wheel            # 看日志
docker compose restart                        # 重启
```

## 数据与备份

| 文件 | 内容 | 修改方式 |
|---|---|---|
| `data/config.json` | 标题/文案/配色/款式/次数上限 | 后台「活动设置」或直接改文件 |
| `data/prizes.json` | 奖品列表（名称/图片/份数/权重/颜色） | 后台「奖品管理」或直接改文件 |
| `data/records.json` | 本轮抽奖记录 | 后台「抽奖记录」导出 CSV / 一键重置 |

- 改 `data/*.json` 后**无需重启**（每次读写都走文件）；不放心就 `docker compose restart`
- 后台「备份恢复」可全量导出/导入 JSON，迁移直接拷 `data/` 目录

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
