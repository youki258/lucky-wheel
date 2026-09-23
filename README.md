# lucky-wheel 抽奖大屏

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Demo](https://img.shields.io/badge/live-demo-brightgreen.svg)](https://youki258.github.io/lucky-wheel/)

面向年会、活动、门店促销等场景的网页抽奖大屏。免安装，浏览器打开即可使用；标题、文案、奖品、配色、款式与抽奖次数均可在管理后台配置，无需修改代码。

**在线 Demo：** [youki258.github.io/lucky-wheel](https://youki258.github.io/lucky-wheel/)

- 大转盘 / 九宫格 / 老虎机 三种款式，后台一键切换
- 管理后台 `/#/admin`，默认密码 `admin123`
- Demo 数据保存在浏览器 localStorage，换设备或清空缓存会重置

## 功能

| 页面 | 说明 |
|---|---|
| 抽奖页 `/#/` | 转盘抽奖、剩余次数、中奖弹窗 |
| 管理后台 `/#/admin` | 标题 / 配色 / 款式、奖品增删、总次数限制、中奖记录、CSV 导出、JSON 备份 |

奖品支持名称、图片、份数与权重（权重越高越容易中）。抽中的奖品会从盘面移除，库存不会超发。

## 快速开始

### 方式一：在线 Demo

直接访问上方链接即可体验。数据仅存于当前浏览器，适合预览与调试。

### 方式二：Docker 自部署

适用于需要服务端记账、多端共享数据的正式场景：

```bash
mkdir -p lucky-wheel && cd lucky-wheel
curl -fsSL https://raw.githubusercontent.com/youki258/lucky-wheel/main/docker-compose.yml -o docker-compose.yml
echo 'ADMIN_PASSWORD=your-strong-password' > .env
docker compose pull && docker compose up -d
```

访问 `http://服务器IP:3001`，可按需在前置 nginx / caddy 添加 HTTPS 与自定义域名。

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3001` | 对外端口 |
| `ADMIN_PASSWORD` | `admin123` | 管理后台密码，**部署时务必修改** |

数据持久化在宿主机 `data/` 目录（`config.json` 配置、`prizes.json` 奖品、`records.json` 记录）。升级镜像、重启容器不会丢失；直接修改 JSON 文件同样生效，无需重启。

常用运维命令：

```bash
docker compose pull && docker compose up -d   # 更新镜像
docker compose logs -f lucky-wheel            # 查看日志
docker compose restart                        # 重启
```

> 仓库附带 [`render.yaml`](render.yaml) 蓝图，可在 Render 等支持 Docker 的 PaaS 一键部署（免费档通常需绑定支付方式）。

## 本地开发

```bash
pnpm install
pnpm dev     # 前端 http://localhost:5173 ，API 代理至 3001
```

```bash
pnpm build          # 生产构建 → dist/（完整版 / Docker）
pnpm build:demo     # Demo 构建（数据存浏览器）
pnpm preview:demo   # 本地预览 Demo 构建
pnpm start          # 纯后端模式（3001，同时托管 dist/）
```

## API

前后端通过同一套 HTTP 接口通信，便于对接其他前端或小程序：

| 接口 | 鉴权 | 说明 |
|---|---|---|
| `GET /api/public` | 公开 | 抽奖页数据：配置 + 奖品（含剩余）+ 剩余次数 |
| `POST /api/draw` | 公开 | 抽奖一次（服务端加权随机、扣库存、写记录） |
| `POST /api/login` · `POST /api/logout` · `GET /api/session` | 公开 | 管理会话 |
| `GET/PUT /api/config` · `GET/PUT /api/prizes` | 管理员 | 活动配置 / 奖品全量替换 |
| `GET /api/records` · `GET /api/records/export.csv` · `POST /api/reset` | 管理员 | 中奖记录 / CSV 导出 / 重置本轮 |
| `POST /api/import` | 管理员 | 从备份 JSON 恢复 |

## 技术栈

Vue 3 + Vite + Element Plus · lucky-canvas · Express + JSON 文件存储 · Docker

## License

[Apache-2.0](LICENSE)
