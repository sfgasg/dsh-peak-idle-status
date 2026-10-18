# DSH 高峰 / 空闲实时状态

为 DeepSeek Harness 网页端和桌面端显示北京时间的高峰/空闲状态，右下角悬浮卡每秒刷新。

## 从 GitHub 安装

可直接在 DSH「插件 → 添加插件」中输入：

    github:sfgasg/dsh-peak-idle-status

桌面端命令：

    dsh plugin --profile desktop add github:sfgasg/dsh-peak-idle-status

网页端命令：

    dsh plugin --profile web add github:sfgasg/dsh-peak-idle-status

安装完成后点击「立即启用」；如果未出现状态卡，重启 DSH。
自定义 profile 请将 desktop 或 web 换成实际名称。
本仓库提交了预构建的 client.js 和 index.js，从 GitHub 安装时不需要手动构建、额外依赖或 API Key。
这里使用 GitHub 安装地址；暂未发布 npm，不能省略 github:sfgasg/ 只输入纯包名。

## 规则

- 固定使用北京时间（UTC+8），与设备所在时区无关。
- 周一至周五 09:00–12:00、14:00–18:00 为高峰，起点包含、终点不包含。
- 其余时段空闲。12:00、18:00 整立即进入空闲。
- 周六和周日全天空闲，包括调休上班的周末。
- 中国法定节假日以及国务院公布的放假调休休息日全天空闲。
- 只显示上述自定义状态，不查询账户计费，不修改请求或模型。

## 节假日

内置 2026 年完整假期数据，离线可用。该年数据来自 [holiday-cn](https://github.com/NateScarlet/holiday-cn)，并对照[国务院通知](https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm)核验。
插件启动及每 6 小时尝试获取当年和下一年的公开年度 JSON：先用 jsDelivr，失败后尝试 GitHub Raw。请求不携带登录凭据或页面来源；每次请求最多等待 8 秒。数据缓存在当前页面来源的 localStorage 中。

点击状态卡可展开规则、手动更新或离线导入 holiday-cn 年度 JSON。
未来年份数据未就绪时：周末及高峰窗口外仍明确显示空闲；工作日高峰窗口显示「待核验」，避免把假期误判为高峰。
若外网访问受阻，2026 年内置数据继续生效，后续年份可手动导入。

## 开发与测试

需要 Node.js 20 或更高版本，无额外依赖。

    npm run build
    npm test
    npm pack --dry-run --ignore-scripts

source-status.cjs 是时段逻辑模板，source-client.cjs 是客户端界面；构建会读取 2026.json，并生成 status.cjs 和 client.js。
请同时提交源文件和最新 client.js / status.cjs。不要手工修改这两个生成文件。
64 项测试覆盖边界时刻、所有内置假期、调休周末、时区换算、缺失年度、数据验证和客户端挂载/定时切换/卸载。

## 卸载

    dsh plugin --profile desktop remove dsh-peak-idle-status

网页端将 desktop 换成 web。也可以在 DSH 插件页卸载。

## 兼容性与隐私

使用 DSH 的 dsh.bundle / dsh.client / __ModuleLoader__.load 工厂契约。适用于网页客户端和使用该客户端的桌面版，纯终端界面不会显示悬浮卡。
DSH 插件接口仍可能演进，出现版本差异时可能需要适配。
不读取账号、密钥或聊天内容。网络访问仅用于公开节假日 JSON；缓存键名前缀是 dsh-peak-idle-status:calendar:。

## 许可证

MIT。节假日数据来自国务院公开公告及 holiday-cn 项目。
