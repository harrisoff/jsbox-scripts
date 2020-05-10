# jsbox-scripts

JSBox 自用脚本。

[JSBox 文档](https://docs.xteko.com/#/)

## 目录

- `ssr-sub-update.js` 更新 SSR 订阅文件

## 更新 SSR 订阅文件

自己的服务器上有一个 SSR 订阅列表文件。通过 [Telegram 白嫖频道](https://t.me/ssrList) 不定期更新。

使用方法：
1. 修改脚本内的 `SSH_OPTION` 和 `SUB_PATH` 配置
2. 复制新的订阅文件内容
3. 运行脚本

脚本将备份服务器上的旧文件，对比新旧文件内容，去重后覆盖写入。