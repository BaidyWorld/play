# Baidy World · 白帝的小世界

白帝玩一玩，游戏探索。

这是一个面向刚接触互联网的小学生的小游戏与作品空间：玩一玩，看看作品是怎样做出来的，再尝试改出自己的想法。目前包含一个游戏大厅、两款小游戏，以及解谜游戏的制作教学。

项目采用原生 HTML、CSS、SVG 和 Canvas / JavaScript，纯静态运行，无需后端、安装依赖或构建。游戏不设金币和付费解锁。

## 从这里开始

| 入口 | 内容 |
| --- | --- |
| [游戏大厅](index.html) | 选择游戏，统一入口 |
| [放学后的秘密实验室](lab/index.html) | 寻找线索、解开六道谜题，帮助小机器人走出实验室 |
| [制作教学](lab/making.html) | 了解解谜逻辑、页面交互和 2.5D 视觉的实现 |
| [钢铁防线](tank/index.html) | 带领队友守护基地，使用不同武器和技能迎击敌军 |
| [城市巷战](tank/index.html?map=city) | 坦克游戏的第二张地图，包含窄巷、街角和建筑掩体 |

游戏页面顶部可返回大厅。坦克的三路防线与城市地图属于同一款游戏，切换地图会重置本局。游戏进度保存在页面内存中，离开页面或刷新会重新开始。

## 本地运行

安装 Python 3 后，在项目根目录运行：

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

浏览器打开 [本地游戏大厅](http://127.0.0.1:4173/)。也可直接用浏览器打开根目录 `index.html`。在 GitHub 仓库页面中点击 HTML 文件只会查看源码，试玩请使用本地预览或部署后的站点。

## 操作提示

**秘密实验室：**点击物件寻找线索；Tab 选择、Enter 激活、Esc 关闭弹窗。遇到困难可使用提示与下一步引导。

**钢铁防线：**绿色坦克是玩家，蓝色是队友，带 ★ 的是护卫，红褐色是敌军。

| 操作 | 按键 |
| --- | --- |
| 移动 | 方向键 / WASD |
| 主武器 / 副机枪 | 空格 / Shift，可同时使用 |
| 切换四种主武器 | 1–4 |
| 冲刺 / 隐身 / 护盾 | Q / E / F |
| 自动 / 手动驾驶 | M；移动键可随时接管 |
| 撤回大本营 | R |
| 自爆，消耗一条命 | 长按 X 一秒；松开或暂停取消 |
| 暂停 / 继续 | P |

页面也提供触摸按钮。炮塔默认自动锁定附近最近的敌人，但手动驾驶时不会自动开火。每局三条命，机体耐久耗尽才扣命；脱战后会自动修理。基地被击中或生命耗尽即失败，消灭全部十辆敌军且基地存活则获胜。

护卫、武器、技能、修理与地图的详细规则见 [GAMES.md](GAMES.md)。

## 目录结构

```text
play/
├── index.html          # 游戏大厅
├── README.md           # 项目介绍与使用方法
├── GAMES.md            # 详细游戏规则
├── LICENSE             # 许可证
├── .nojekyll           # 静态文件部署标记
├── check.cjs           # 全量检查
├── lab/
│   ├── index.html      # 解谜游戏
│   ├── visual.css
│   ├── making.html     # 制作教学
│   └── check.cjs
└── tank/
    ├── index.html      # 坦克游戏及地图选择
    ├── tank.js
    └── check.cjs
```

每款小游戏的专属资源都放在自己的目录中，根目录负责提供统一入口。

## 部署到 GitHub Pages

当前仓库：[BaidyWorld/play](https://github.com/BaidyWorld/play)，远程地址为 `git@github.com:BaidyWorld/play.git`。

1. 将整个项目目录的内容提交到准备发布的仓库分支，保留 `lab/`、`tank/` 和 `.nojekyll`。
2. 在仓库 **Settings → Pages** 中选择 **Deploy from a branch**，指定该分支和 **/ (root)** 目录。
3. 保存后，以 Pages 页面显示的部署结果和站点地址为准。

使用默认域名时，部署后预计地址为 [https://baidyworld.github.io/play/](https://baidyworld.github.io/play/)。此处仅说明预期地址，未确认该站点已经上线。

所有站内导航和资源引用均为相对路径，兼容 `/play/` 等仓库子路径，无需改域名、配置后端或执行项目构建。城市地图对应 `tank/index.html?map=city`。

## 验证

检查脚本需要 **Node.js 和 macOS 上默认安装位置的 Google Chrome**；小游戏本身不依赖这些测试工具。

在根目录运行：

```sh
node check.cjs                    # 两款游戏玩法 + 静态部署路径
node lab/check.cjs                # 解谜游戏
node tank/check.cjs               # 坦克游戏
node check.cjs --deployment-only  # 仅检查入口、资源与仓库子路径
```

检查覆盖桌面与手机尺寸下的游戏流程，并临时使用 `/repo-name/` 前缀验证大厅跳转、资源加载、城市地图参数、地图切换和返回链接。

## 许可证

本项目采用 **Apache License 2.0**，具体条款以仓库中的 [LICENSE](LICENSE) 为准。
