# 勤俭节约社会实践

## 启动

```bash
npm run dev
```

桌宠“小俭”支持文字对话、语音提问和语音播报。要启用大模型智能对话：

1. 复制 `.env.example` 为 `.env`。
2. 在 `.env` 中设置服务端环境变量 `OPENAI_API_KEY`。
3. 重新运行 `npm run dev`。

密钥只由 `api` 服务读取，不会发送到浏览器。未配置密钥或 AI 服务暂时不可用时，小俭会自动使用内置的节约主题知识回答。

## 实践数据

证据条目、匿名承诺、互动房间和投票会持久化到 `api/data/practice-store.json`。文件不存在时，服务只会创建一次明确标注为 Demo 的确定性种子；重启服务不会重置已有数据。

可通过服务端环境变量 `PRACTICE_DATA_PATH` 修改数据文件位置。正式部署到无持久磁盘的 Serverless 环境时，应将当前 repository 实现替换为托管数据库，前端和 API 契约无需修改。

`GET /api/health` 会检查实践数据仓储，并报告运行环境、AI 与管理员配置是否就绪；不会返回密钥。仓储不可读取或版本不兼容时返回 `503`。每个 API 响应都包含 `X-Request-Id`，服务日志仅记录请求编号、路径、状态和耗时，不记录正文、Cookie 或令牌。

## 内容后台登录

访问 `/admin` 后需要管理员登录。服务端使用 HttpOnly 会话 Cookie，内容写操作还会校验 CSRF Token；操作人由服务端会话确定，前端不能自行填写。

本地开发未配置环境变量时使用 `admin / jianqi-demo` 作为明确标注的演示账号。生产环境不会启用该默认账号，必须设置 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`，并通过部署平台的密钥管理保存强密码。

## 现场互动

主持人访问 `/presenter`，点击“互动二维码”即可展示当前房间的真实二维码和实时票数。观众扫码进入 `/join/JIANQI-01`，无需注册即可匿名投票；同一设备重复提交不会增加票数，等待、暂停和结束状态也会阻止新投票。

本地二维码使用当前网页地址生成。需要手机扫码联调时，请让手机与电脑处于同一网络，并使用电脑局域网地址访问网页；部署后二维码会自动使用正式域名。

## 质量检查

```bash
npm run check:all
```

该命令依次执行 TypeScript 检查、代码规范检查和生产构建。

启动前后端后运行 `npm run demo:check` 可检查健康接口、主持页、观众页和数据文件。完整的答辩前检查、数据备份、故障降级与回滚步骤见 `演示保障清单.md`。

## 技术栈

React + TypeScript + Vite，Express 提供服务端 API。

---

# Vite template notes

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  extends: [
    // other configs...
    // Enable lint rules for React
    reactX.configs['recommended-typescript'],
    // Enable lint rules for React DOM
    reactDom.configs.recommended,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```
