# 微信小程序 Implementation Plan

**Goal:** 在同一仓库交付与最新 H5 同步的可导入微信小程序。
**Architecture:** 原生 WXML/WXSS/JS；构建时复用 H5 核心，wx API 提供存储、请求、canvas、分享。图片分包按需加载。
**Tech Stack:** 微信基础库 3.4.0+、Node 22+、sharp。
**Spec:** docs/superpowers/specs/2026-10-10-wechat-miniprogram-design.md

## Global Constraints

- AppID 为 wx3b755ea7217f2cc0；不改动 H5 的现有产品行为。
- 主包与每个分包低于 2 MB；总包低于 20 MB。
- 游客直接可用；同一 Supabase 邮箱账号同步菜单和待办。
- 不推送主分支、发布或提交微信审核；以功能分支和 PR 交付。

## Review Focus

- 北京时间跨日及设备不支持中文农历 Intl 时，日期正确且不猜测农历。
- 离线、令牌过期、退出期间在途请求：队列不丢失、退出不恢复旧账号。
- 快速切换日期和城市：旧异步响应不能覆盖当前选择。
- 相册授权拒绝、图片分包下载失败：有反馈和本地备用图。
- 首次登录与重复游客导入：不覆盖已有云端菜单、不重复待办。

## Task 1：共享逻辑和构建

- [x] 为生成结果、菜单指针、日期、账号隔离和包体写测试，运行确认新增功能未实现。
- [x] scripts/build-miniprogram.cjs 生成 miniprogram/generated/*.js、内容及压缩分包照片。
- [x] 创建配置、app 和基础样式，运行共享逻辑及包体测试。

## Task 2：原生交互和网络

- [x] 为 wx.request 的 REST 格式、会话恢复刷新、失败队列与退出竞争，以及日期只读写入测试并观察失败。
- [x] 实现 utils/storage.js、request.js、account.js、dates.js、weather.js、canvas.js。
- [x] 实现 pages/index、calendar、account，验证原生页面方法与生命周期。

## Task 3：交付

- [x] 添加自动构建与测试工作流、zip 产物和中文导入/后台配置/真机验收文档。
- [x] 运行 node --test tests/*.test.mjs、H5 菜单检查及小程序所有 JS 语法检查。
- [x] 审查差异并修复影响使用的问题。交付方式为提交及推送独立分支、创建 PR；保留主分支。

实施由当前会话直接完成。用户已明确同意新增方案；不为常规可逆实现重复申请授权。测试证据和限制记入交付说明。

## 验证记录

- Node 全量测试 47/47 通过；H5 菜单检查通过。
- 21 个小程序 JS 文件语法检查、6 份 WXML 模板、7 份 WXSS 样式编译通过。
- 审查发现的首次离线导入覆盖风险和旧城市失败竞态，新增测试先失败再修复通过；导入菜单使用服务端 ignore-duplicates。
- 使用原生照片分包；微信开发者工具与真机运行、域名配置及真实邮件/RLS 尚未验收。
- 云端菜单更新时清除旧结果，避免新转盘与旧结果不一致；回归测试 RED→GREEN。
