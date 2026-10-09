# 每日图片日历 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 本计划默认由当前助手顺序执行，不调用子代理。

**Goal:** 在日常小决定中加入免费的每日图片日历，保留现有转盘，支持历史浏览和保存。

**Architecture:** 保留静态 GitHub Pages 部署，增加独立日历模块和静态内容库。按北京时间选择固定顺序的内容，用本地图片和 Canvas 导出，不依赖数据库、每日后台任务或付费 AI。现有转盘脚本不做无关重构。

**Tech Stack:** 原生 HTML/CSS/JavaScript、浏览器 Intl 与 Canvas、Node.js 22、现有 sharp 0.34.3 构建、Playwright 验证。

**Spec:** ../specs/2026-10-09-daily-calendar-design.md；../../content/daily-calendar-first-seven-days.md

## Global Constraints
- 免费素材库按日期更新；不使用付费 AI 接口。
- 统一使用北京时间 Asia/Shanghai。同一天所有访客内容一致。
- 正文、提示、按钮至少 14px；留白舒展，允许滚动，不裁切长内容。
- 已确认视觉：暖白底、森林绿、生活感摄影、居中文字、大号日期。
- 故事先显示摘要，点击“读完整故事”展开，保存时只保留摘要和出处。
- 保留餐食与咖啡转盘、居中结果、自定义菜单、本地保存、Clarity 和两份微信验证文件。
- 正式图片必须记录来源、作者及许可，下载到本地；人物故事为原创转述，引用注明真实出处。
- 首批 7 条完成后扩充到 30 条；不因新增内容重排历史映射。
- 不修改域名根验证仓库。

## Review Focus
1. 浏览器处于境外时区、北京时间午夜：今天和农历仍按北京时间切换。
2. 图片失败、下载失败或微信不支持下载：内容可读，备用图与长按保存入口可用。
3. 长故事、八字菜单、字体放大与 320px 手机：允许滚动，没有横向溢出，编辑按钮可见。
4. 内容库扩充或轮换、未来日期链接：历史映射稳定，未来日期返回今天。
5. Canvas 中文字体尚未加载、长引文：导出等待字体、自动换行，不裁切，不导出全故事。

## 文件职责
- `index.html`：两个页面入口与日历语义结构；现有转盘保留。
- `calendar/calendar-core.mjs`：日期、农历、历史内容选择，纯函数。
- `calendar/calendar-ui.mjs`：浏览、展开、跨天切换、分享、导出预览。
- `calendar/calendar-export.mjs`：Canvas 排版与图片导出。
- `calendar/calendar.css`：只作用于日历和导航的样式。
- `calendar/content.json`：首批七条内容及稳定日程；图片路径相对本站。
- `calendar/assets/`：七张优化摄影和一张备用画面。
- `docs/content/calendar-asset-sources.md`：作者、原始链接、许可和检查记录。
- `scripts/build.cjs`：复制日历资源并将模块、内容纳入版本指纹。
- `tests/calendar-core.test.mjs`、`tests/calendar-export.test.mjs`：日期与导出关键逻辑。
- `scripts/check-calendar-mobile.cjs`：手机端真实交互检查。
- `.github/workflows/pages.yml`：增加核心检查并保留现有部署。

### Task 1: 完成首批图文与来源
**Files:** `calendar/content.json`、`calendar/assets/`、`docs/content/calendar-asset-sources.md`。
**Interfaces:** ContentEntry = {id,type,theme,text,fullText?,author,work,textSource,imagePath,imageAlt,imageAuthor,imageSource,imageLicense,verified}; Catalog = {firstDate,entries,schedule}；schedule 为起始日期之后连续每天使用的固定 ID 列表。
- [ ] 逐张打开七个候选图片原图检查；记录摄影师、链接和许可，替换不合适图片。故事配图注明气氛用途，不冒充事件照片。
- [ ] 补核对所有引用正文与出处，保留古典原文与原创导读的区分，不复制现代翻译。最终七条全部 verified=true。
- [ ] 优化照片为不大于 1600px 宽的 JPEG，单张目标小于 400KB；生成原创简单几何备用画面。
- [ ] 固定 firstDate 为正式上线当天北京时间日期，保存七条 schedule；未来扩充只追加日程，不改已发布项。没有专属日程时循环固定首批七个 ID。
- [ ] 检查字段完整、ID 唯一、schedule 引用有效、图片文件存在；提交内容与来源记录。

### Task 2: 日期与内容规则
**Files:** `calendar/calendar-core.mjs`、`tests/calendar-core.test.mjs`。
**Interfaces:** beijingDate(now:Date)->YYYY-MM-DD；dateInfo(dateKey:string)->{year,month,day,weekday,lunar,remainingDays}；entryForDate(dateKey:string,catalog:Catalog)->ContentEntry|null；resolveDate(requested:string|null,today:string,firstDate:string)->string。
- [ ] 先写 node:test：2026-10-09T15:59:59Z 对应 2026-10-09，16:00:00Z 对应 2026-10-10；2028-02-29 有效；12 月 31 日 remainingDays=0；非法与未来日期返回今天；发布前日期不可导航。
- [ ] Run `node --test tests/calendar-core.test.mjs`，确认失败指向缺失实现。
- [ ] 实现上述纯函数。农历使用 Intl 中文日历，构造北京时间中午日期避免偏移，明确格式化月份与闰月；测试选取已核实的闰月边界。不支持中文日历时隐藏农历，不展示猜测值。
- [ ] 增加 schedule 扩充后旧日期结果不变、首批用完按固定 ID 循环的测试。
- [ ] 重跑检查并提交。

### Task 3: 日历页面与历史浏览
**Files:** `index.html`、`calendar/calendar-ui.mjs`、`calendar/calendar.css`、`scripts/check-calendar-mobile.cjs`。
**Interfaces:** mountCalendar({catalog,root})->void；export 使用下一任务的 renderCalendarImage 接口。
- [ ] 写交互检查：默认今日日历、入口切换不重置菜单、前一天与返回今天、日期链接恢复、长故事展开收起、午夜及重新获得焦点更新。先确认新入口未实现时失败。
- [ ] 加入顶部“今日日历／小决定”，两个区域仅切换可见性，保持转盘现有 DOM ID 唯一与初始化。
- [ ] 实现大图、正文、出处、大号日期、星期、农历和年度剩余天数。正文 18～20px，辅助文字至少 14px；用独立样式避免影响转盘。第一天禁用前一天，历史状态用 ?date=YYYY-MM-DD。
- [ ] 卡片只显示故事摘要，全文按需展开；“复制链接”失败给出手动复制入口。图片 onerror 切换同源备用图，不能无限重试。
- [ ] 在 320×568、375×600、393×720、430×800 上检查无横向溢出；字体放大到 200% 可滚动阅读；餐食、咖啡、菜单编辑仍可用。
- [ ] Run `node scripts/check-calendar-mobile.cjs`，通过后提交。浏览器优先复用系统 Chromium，不额外要求生产依赖。

### Task 4: 保存日历与微信预览
**Files:** `calendar/calendar-export.mjs`、`tests/calendar-export.test.mjs`、`calendar/calendar-ui.mjs`。
**Interfaces:** wrapText(ctx,text,maxWidth)->string[]；renderCalendarImage(entry:ContentEntry,info:ReturnType<typeof dateInfo>)->Promise<Blob>。
- [ ] 先写换行测试：中文标点、长连续文本、多行诗句均不越界；故事使用摘要；写浏览器导出检查，确认缺少实现时失败。
- [ ] 实现 1080px 宽竖版 Canvas。根据文字行数确定高度，等待 document.fonts.ready，解码同源图片后绘制；日期、出处与落款不裁切。正文使用清晰系统中文字体。
- [ ] 导出失败给出重试；正常生成 Blob 后打开图片预览，提供下载按钮与“微信内可长按图片保存”的提示；关闭预览后回收旧 Blob URL。
- [ ] 比较导出与当前浏览日期一致；用一条故事和最长引文目视检查图片。实际微信长按保存需用户手机验证，不能用 Chromium 代替宣称微信已通过。
- [ ] Run `node --test tests/calendar-export.test.mjs` 及手机导出检查，通过后提交。

### Task 5: 构建、回归与交付
**Files:** `scripts/build.cjs`、`.github/workflows/pages.yml`。
- [ ] 构建复制 calendar 目录；版本指纹覆盖 HTML、日历模块、CSS 和内容 JSON，避免只改内容时旧页面不刷新。
- [ ] 工作流增加 `node --test tests/calendar-core.test.mjs tests/calendar-export.test.mjs`，保留 sharp 构建、原有转盘规则检查和验证文件复制。
- [ ] Run 核心测试、手机交互与导出检查、`node scripts/build.cjs`、`git diff --check`；确认输出目录两份验证 TXT 内容与源文件完全相同，Clarity ID 不变。
- [ ] 本地预览中确认前七天内容和照片，整理完成情况与微信待实机验证项。先交用户审阅，不在本计划阶段推送或发布。
- [ ] 获得后续发布指令后推送并核对 Pages 工作流成功；免费素材库扩充到 30 天另列内容工作，不把首批七条称作已完成三十条。

## 自查与执行边界
本计划覆盖日期、内容、保存、免费来源、历史、失败备用、手机字号和现有功能保留。真实微信内下载交互须实机验证；候选图片还需目视筛选。本次仅写计划，未开始任务 1，也未改业务代码。
