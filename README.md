# lucky-wheel 抽奖大屏

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Demo](https://img.shields.io/badge/live-demo-brightgreen.svg)](https://youki258.github.io/lucky-wheel/)

年会、活动、门店促销用的网页抽奖大屏。打开就能转，不用装软件。

**在线试玩：** [youki258.github.io/lucky-wheel](https://youki258.github.io/lucky-wheel/)

- 三种样式：大转盘、九宫格、老虎机，后台一键切换
- 标题、文案、奖品、颜色、抽奖次数，全部在管理后台改，不用改代码
- 管理后台：`/#/admin`，密码 `admin123`
- 试玩数据只存在你自己的浏览器里，换设备或清缓存会丢

## 你能做什么

| 页面 | 干什么 |
|---|---|
| 抽奖页 `/#/` | 转盘抽奖、看剩余次数、中奖弹窗 |
| 管理后台 `/#/admin` | 改标题/配色/款式、增删奖品、限总次数、看中奖记录、导出 CSV / 备份 JSON |

奖品支持：名称、图片、份数、权重（越容易中）。抽中的奖品会从盘面上消失，库存不会超发。

## 两种用法

### 1. 在线 Demo（免费，现在就能玩）

打开上面的链接即可。数据存在浏览器本地，适合先看看效果。

### 2. 自己部署（正式用）

需要真实服务端记录、多台设备共用同一份数据时，用 Docker 起完整版：

```bash
mkdir -p lucky-wheel && cd lucky-wheel
curl -fsSL https://raw.githubusercontent.com/youki258/lucky-wheel/main/docker-compose.yml -o docker-compose.yml
echo 'ADMIN_PASSWORD=换成你的密码' > .env
docker compose pull && docker compose up -d
```

浏览器打开 `http://服务器IP:3001`。前面套一层 nginx/caddy 就能加 HTTPS 和域名。

| 环境变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | `3001` | 对外端口 |
| `ADMIN_PASSWORD` | `admin123` | 后台密码，**部署时一定要改** |

数据都存在服务器的 `data/` 目录（`config.json` 配置、`prizes.json` 奖品、`records.json` 记录）。升级镜像、重启容器都不会丢；直接改这些文件也行，不用重启。

常用命令：

```bash
docker compose pull && docker compose up -d   # 更新到最新版
docker compose logs -f lucky-wheel            # 看日志
docker compose restart                        # 重启
```

> 仓库里还有 [`render.yaml`](render.yaml)，可以在 Render 等支持 Docker 的平台一键部署（免费档通常要绑卡）。

## 本地开发

```bash
pnpm install
pnpm dev     # 打开 http://localhost:5173 ，后端 API 在 3001
```

其他命令：

```bash
pnpm build          # 生产构建 → dist/（给 Docker / 完整版用）
pnpm build:demo     # Demo 构建（数据存浏览器）
pnpm preview:demo   # 本地预览 Demo 构建
pnpm start          # 只跑后端，端口 3001，同时托管 dist/
```

## API

前后端通过同一套接口通信，方便你自己接别的前端或小程序：

| 接口 | 需要登录 | 作用 |
|---|---|---|
| `GET /api/public` | 否 | 抽奖页数据：配置 + 奖品（含剩余）+ 剩余次数 |
| `POST /api/draw` | 否 | 抽一次（服务端算中奖、扣库存、写记录） |
| `POST /api/login` · `POST /api/logout` · `GET /api/session` | 否 | 管理员登录/登出 |
| `GET/PUT /api/config` · `GET/PUT /api/prizes` | 是 | 改配置 / 改奖品 |
| `GET /api/records` · `GET /api/records/export.csv` · `POST /api/reset` | 是 | 中奖记录 / 导出 / 重置本轮 |
| `POST /api/import` | 是 | 从备份 JSON 恢复 |

## 技术栈

Vue 3 + Vite + Element Plus · lucky-canvas（三种抽奖样式）· Express + JSON 文件存储 · Docker

## License

[Apache-2.0](LICENSE)
