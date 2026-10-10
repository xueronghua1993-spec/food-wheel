# DeepSeek 餐食推荐 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, followed by one fresh whole-branch review.

**Goal:** 做好可部署且默认关闭的安全试用版餐食推荐。
**Architecture:** Pages 前端调用 FC 后端；后端验证、OSS 原子记账、调用 DeepSeek、验证输出。
**Tech Stack:** 原生 ES modules、Node.js 20、ali-oss 6.23.0、Playwright。
**Spec:** docs/superpowers/specs/2026-10-10-deepseek-meal-design.md

## Global Constraints
- 无真实凭据则不做真实模型调用或云资源开通，不发布未配置入口。
- 前端只含公开 endpoint；后端不复制到 public；输入 4096 字节，输出 600 token/32 KiB/20 秒。
- 默认每日 20 次、每月 300 次，来源每小时 3 次、每分钟 1 次；OSS 持久记账成功才消费模型。

## Review Focus
- 并发配额与重启后配额必须保持。
- 伪造来源头、未知字段和提示注入不能绕过上限。
- 超时/不合法输出不得泄漏异常或替换菜单。
- 菜单已有自定义内容只在用户确认后替换。
- 发布包不包含后端、密钥、试用码，新增资源有缓存版本。

### Task 1: 后端与安全边界
Files: ai/meal-rules.mjs; backend/meal/{app,quota,oss-store,server}.mjs; tests/meal-api.test.mjs; tests/meal-quota.test.mjs。
Interfaces: validatePreferences, validateOptions; reserveQuota(store,client,now,limits); createMealHandler({config,store,fetchImpl,now}) 返回 HTTP handler。
- [ ] 写输入、输出、配额并发、来源伪造、授权、超时的失败测试，运行并确认失败。
- [ ] 实现纯校验、持久配额和 HTTP 后端；通过以上测试。

### Task 2: 手机入口和转盘连接
Files: ai/{config,meal-ui}.mjs; ai/meal.css; index.html; scripts/build.cjs; scripts/check-meal.cjs; tests/meal-build.test.mjs。
Interfaces: meal-menu-request 事件含 options 名称；主页面验证后替换并持久化餐食菜单。
- [ ] 写默认关闭、成功到转盘、错误重试、关闭取消、自定义替换确认、手机尺寸和安全发布包测试；确认失败。
- [ ] 实现弹窗、纯文本结果与确认，运行浏览器和构建测试。

### Task 3: 交付和验证
Files: backend/meal/package*.json; scripts/package-meal.cjs; docs/ai-meal-setup.md; .github/workflows/check.yml。
- [ ] 打包后端独立 ZIP，执行 Node 语法检查、完整测试与相关浏览器检查。
- [ ] 写新手操作说明、费用边界、停止办法和真实联调检查。
- [ ] 做一次独立审查，修复重要问题，提交独立功能分支；缺少云账号配置则明确交付边界。
