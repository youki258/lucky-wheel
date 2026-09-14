# lucky-wheel 抽奖大屏

配置驱动的抽奖大屏系统：**页面上没有任何写死的内容**——标题/文案/奖品/颜色/款式/次数全部在后台或配置文件里改，不碰代码。

- 抽奖页 `/#/`：大转盘 / 九宫格 / 老虎机 三种款式，配置即时切换
- 管理后台 `/#/admin`：活动设置、奖品管理、抽奖记录、备份恢复
- 服务端按「剩余份数 × 权重」加权随机，库存不超发；**抽到即消失**（某奖品剩余归零后从盘面移除）
- 支持限总次数、奖品图片、背景图/渐变、粒子/彩带/音效

## 本地开发

```bash
pnpm install
pnpm dev          # 后端 3001 + 前端热更 5173（/api 自动代理）
pnpm build        # 构建前端到 dist/
pnpm start        # 纯后端生产模式（3001 同时托管 dist）
```

默认管理员密码 `admin123`（环境变量 `ADMIN_PASSWORD` 可改）。

## Docker 部署（推荐）

镜像由 GitHub Actions 自动构建并发布到 GHCR（私有镜像 `ghcr.io/youki258/lucky-wheel:latest`），推代码即构建。

### 部署到服务器（ssh az）

```bash
# 1. 服务器上登录 GHCR（首次；PAT 需勾选 read:packages 权限）
echo 你的PAT | docker login ghcr.io -u youki258 --password-stdin

# 2. 拉镜像 + 启动（无需在服务器上装 Node/pnpm）
ssh az -t "mkdir -p ~/lucky-wheel && cd ~/lucky-wheel \\
  && [ -f docker-compose.yml ] || curl -fsSL https://raw.githubusercontent.com/youki258/lucky-wheel/main/docker-compose.yml -o docker-compose.yml \\
  && echo 'ADMIN_PASSWORD=你的密码' > .env \\
  && docker compose pull && docker compose up -d"

# 3. HTTPS 反代（nginx/caddy 指向 127.0.0.1:3001）
```

也可以 rsync 源码到服务器后 `docker compose up -d --build` 现场构建（不依赖 GHCR 登录）。

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

### 部署到服务器（ssh az）

```bash
# 1. 同步代码（或 git clone）
rsync -av --exclude node_modules --exclude data --exclude .git ./ az:~/lucky-wheel/
# 2. 上服务器启动
ssh az -t "cd ~/lucky-wheel && ADMIN_PASSWORD=你的密码 docker compose up -d --build"
# 3. HTTPS 反代（nginx/caddy 指向 127.0.0.1:3001 即可）
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
