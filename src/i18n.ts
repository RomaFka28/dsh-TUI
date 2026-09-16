/**
 * dsh-tui localization — UI strings for Chinese (`zh`, the default) and
 * English (`en`).
 *
 * Resolution order mirrors the `/theme` mechanism (see themePrefs.ts):
 *
 *   1. `DSH_TUI_LANG` env var (`en` / `zh`) — pinned at process start
 *   2. `lang` cordis.yml config key (see Config in index.ts)
 *   3. the persisted `/lang` choice in `~/.dsh-tui/lang.json`
 *   4. the OS locale guess (`LC_ALL` / `LC_MESSAGES` / `LANG`)
 *   5. `zh` (the original hard-coded language)
 *
 * `/lang` switches at runtime and hot-swaps the whole UI. The dictionary is
 * a flat key → per-language text map; `t(key, params)` substitutes
 * `{{name}}` placeholders with the given params. A per-language value is
 * either a plain template or `{ one, other }` plural forms selected via
 * `Intl.PluralRules` on the `count` param (zh has no grammatical number and
 * always resolves to `other`). Missing keys render the key itself so a typo
 * is visible in the UI instead of silently blank.
 *
 * The dictionary shape is enforced at compile time (`satisfies` below):
 * every entry carries zh, and en is optional only for the `cmd-desc-*`
 * family whose en truth lives in the command registry (see {@link tOr}).
 * scripts/verify-i18n.ts adds the checks types cannot express: placeholder
 * parity between languages, single-brace typos, and dead keys.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './utils/paths.js'

export type Lang = 'zh' | 'en' | 'ru'

const PREFS_DIR = DATA_DIR

/** The languages shipped with the plugin, in display order. */
export const LANGS = ['zh', 'en', 'ru'] as const

/**
 * One dictionary value in one language: a plain `{{name}}` template, or
 * plural forms picked by the `count` param through `Intl.PluralRules`.
 * Only `one`/`other` exist because those are the only CLDR categories zh
 * and en use; a third shipped language may need more.
 */
export type I18nText = string | { one: string; other: string }

const dict = {
  // ── channel.ts ───────────────────────────────────────────────────────
  // Working spinner labels. WorkingSpinner resolves these through the
  // `spinner-verb-*` dynamic family so the status stays localized after a
  // runtime language switch.
  'spinner-verb-analyzing': { zh: '分析中', en: 'Analyzing', ru: 'Анализирую' },
  'spinner-verb-thinking': { zh: '思考中', en: 'Thinking', ru: 'Думаю' },
  'spinner-verb-working': { zh: '工作中', en: 'Working', ru: 'Работаю' },
  'spinner-verb-considering': { zh: '斟酌中', en: 'Considering', ru: 'Обдумываю' },
  'spinner-verb-reviewing': { zh: '审阅中', en: 'Reviewing', ru: 'Просматриваю' },
  'spinner-verb-planning': { zh: '规划中', en: 'Planning', ru: 'Планирую' },
  'spinner-verb-checking': { zh: '检查中', en: 'Checking', ru: 'Проверяю' },
  'spinner-verb-reading': { zh: '读取中', en: 'Reading', ru: 'Читаю' },
  'spinner-verb-searching': { zh: '检索中', en: 'Searching', ru: 'Ищу' },
  'spinner-verb-building': { zh: '构建中', en: 'Building', ru: 'Собираю' },
  'spinner-verb-testing': { zh: '测试中', en: 'Testing', ru: 'Тестирую' },
  'spinner-verb-connecting': { zh: '连接中', en: 'Connecting', ru: 'Подключаюсь' },
  'spinner-verb-preparing': { zh: '准备中', en: 'Preparing', ru: 'Готовлюсь' },
  'spinner-verb-exploring': { zh: '探索中', en: 'Exploring', ru: 'Исследую' },
  'spinner-verb-reasoning': { zh: '推理中', en: 'Reasoning', ru: 'Рассуждаю' },
  'spinner-verb-summarizing': { zh: '总结中', en: 'Summarizing', ru: 'Подытоживаю' },
  'spinner-verb-resolving': { zh: '解析中', en: 'Resolving', ru: 'Разбираю' },
  'spinner-verb-responding': { zh: '回应中', en: 'Responding', ru: 'Отвечаю' },
  'activity-indicator-already': { zh: '指示器已是：{{name}}', en: 'Indicator already set: {{name}}', ru: 'Индикатор уже: {{name}}' },
  'activity-indicator-switched': { zh: '指示器已切换：{{name}}（已保存）', en: 'Indicator switched: {{name}} (saved)', ru: 'Индикатор переключён: {{name}} (сохранено)' },
  'activity-pref-write-failed': { zh: '无法写入 ~/.dsh-tui/working-activity.json，切换未保存', en: 'Cannot write ~/.dsh-tui/working-activity.json, switch not saved', ru: 'Не удалось записать ~/.dsh-tui/working-activity.json, переключение не сохранено' },
  'model-pref-write-failed': { zh: '无法写入 ~/.dsh-tui/model.json，模型选择不会保存到重启后', en: 'Cannot write ~/.dsh-tui/model.json, the model choice will not survive a restart', ru: 'Не удалось записать ~/.dsh-tui/model.json, выбор модели не сохранится после перезапуска' },
  'model-route-invalid': { zh: '持久化的模型路由 {{provider}}/{{model}} 不在该 provider 的模型列表中，已整体回退到 {{fallback}}', en: 'Persisted model route {{provider}}/{{model}} is not advertised by that provider; fell back to {{fallback}}', ru: 'Сохранённый маршрут модели {{provider}}/{{model}} отсутствует в списке моделей этого провайдера; выполнен откат к {{fallback}}' },
  'unknown-activity-preset': { zh: '未知预设「{{name}}」· /activity frames 查看全部', en: 'Unknown preset "{{name}}" · /activity frames to view all', ru: 'Неизвестный пресет «{{name}}» · /activity frames для просмотра всех' },
  'preset-unavailable': { zh: 'Preset 不可用——当前组合未挂载 agent-presets 名册', en: 'Preset unavailable — the agent-presets roster is not mounted', ru: 'Пресет недоступен — список agent-presets не подключён в текущей комбинации' },
  'preset-agent-running': { zh: 'Agent 运行中，无法切换 preset', en: 'Agent is running, cannot switch preset', ru: 'Агент запущен, невозможно переключить пресет' },
  'preset-not-found': { zh: 'Preset「{{id}}」不存在 · {{err}}', en: 'Preset "{{id}}" not found · {{err}}', ru: 'Пресет «{{id}}» не найден · {{err}}' },
  'preset-load-failed': { zh: 'Preset「{{id}}」无法加载 · {{broken}}', en: 'Preset "{{id}}" failed to load · {{broken}}', ru: 'Не удалось загрузить пресет «{{id}}» · {{broken}}' },
  'preset-already-current': { zh: '当前 preset 已是：{{id}}', en: 'Current preset already: {{id}}', ru: 'Текущий пресет уже: {{id}}' },
  'preset-pref-write-failed': { zh: '无法写入 ~/.dsh-tui/agent-preset.json，选择未保存', en: 'Cannot write ~/.dsh-tui/agent-preset.json, selection not saved', ru: 'Не удалось записать ~/.dsh-tui/agent-preset.json, выбор не сохранён' },
  'preset-locked-saved-default': { zh: '会话已开始，preset 已锁定（当前：{{current}}）· 已保存为默认：{{id}}（/new 或下次启动生效）', en: 'Session already started, preset locked (current: {{current}}) · Saved as default: {{id}} (applies on /new or next start)', ru: 'Сессия уже начата, пресет заблокирован (текущий: {{current}}) · Сохранён как пресет по умолчанию: {{id}} (применяется при /new или следующем запуске)' },
  'preset-switch-failed': { zh: 'Preset 切换失败 · {{err}}', en: 'Preset switch failed · {{err}}', ru: 'Не удалось переключить пресет · {{err}}' },
  'preset-switched-pref-failed': { zh: 'Preset 已切换：{{id}}，但默认偏好写入失败（重启后不保留）', en: 'Preset switched: {{id}}, but writing the default preference failed (won\'t persist after restart)', ru: 'Пресет переключён: {{id}}, но запись предпочтения по умолчанию не удалась (не сохранится после перезапуска)' },
  'preset-switched-saved': { zh: 'Preset 已切换：{{id}}（已保存为默认）', en: 'Preset switched: {{id}} (saved as default)', ru: 'Пресет переключён: {{id}} (сохранён как пресет по умолчанию)' },
  // Built-in preset display text (issue: the /preset picker showed the raw
  // preset.yml copy, which is Chinese, even under `en`). zh mirrors the
  // stock preset.yml `name`/`description` verbatim (zh display keeps the
  // roster text — see listPresets in channel.ts); en is the localized
  // surface. Keys resolve per roster id via tOr(`preset-name-${id}`), so
  // unknown (user-authored) ids fall through untouched.
  'preset-name-standard': { zh: '标准模式', en: 'Standard', ru: 'Стандартный режим' },
  'preset-desc-standard': { zh: '功能完整的编码 Agent，支持文件编辑、Shell、文件与网页检索、Skills、计划、目标、子代理和工作流。', en: 'Full-featured coding agent: file editing, shell, file & web search, skills, plans, goals, subagents and workflows.', ru: 'Полнофункциональный кодирующий агент: редактирование файлов, shell, поиск по файлам и вебу, навыки, планы, цели, субагенты и рабочие процессы.' },
  'preset-name-minimal': { zh: '极简模式', en: 'Minimal', ru: 'Минимальный режим' },
  'preset-desc-minimal': { zh: '仅提供持久 bash 与 str_replace_editor 的双工具编码 Agent。', en: 'A two-tool coding agent exposing only persistent bash and str_replace_editor.', ru: 'Кодирующий агент из двух инструментов, предоставляющий только постоянный bash и str_replace_editor.' },
  'preset-name-code': { zh: 'PTC 模式', en: 'PTC', ru: 'Режим PTC' },
  'preset-desc-code': { zh: '具备标准模式的全部能力，并通过 Code Mode SDK 呈现工具，让模型用一个 TypeScript 程序组合多步操作。', en: 'Everything standard mode offers, with tools exposed through the Code Mode SDK so the model composes multi-step operations in one TypeScript program.', ru: 'Всё, что предлагает стандартный режим, плюс инструменты через Code Mode SDK, позволяющие модели объединять многошаговые операции в одной программе TypeScript.' },
  'preset-name-cordis': { zh: '创造模式', en: 'Creation', ru: 'Режим творения' },
  'preset-desc-cordis': { zh: '用于创建自定义 Agent preset：具备标准模式的全部能力，并提供运行时检查、插件实验和 preset 创作指导。', en: 'For authoring custom agent presets: everything standard mode offers plus runtime inspection, plugin experiments and preset-authoring guidance.', ru: 'Для создания собственных пресетов агента: всё, что предлагает стандартный режим, плюс проверка времени выполнения, эксперименты с плагинами и рекомендации по созданию пресетов.' },
  'preset-name-liangshen': { zh: '梁神模式', en: 'Liangshen mode', ru: 'Режим Liangshen' },
  'preset-desc-liangshen': { zh: '主 Agent 与子 Agent 首轮均保持 Minimal 双工具，首次工具调用后开放完整目录，压缩后重新锚定。', en: 'Root and delegated agents keep the minimal two-tool pair on the first turn; the full catalog opens after the first tool call and re-anchors after compaction.', ru: 'Основной и делегированные агенты сохраняют пару из двух минимальных инструментов на первом шаге; полный каталог открывается после первого вызова инструмента и снова привязывается после сжатия.' },
  'mcp-none-configured': { zh: '未配置 MCP 服务器。', en: 'No MCP servers configured.', ru: 'MCP-серверы не настроены.' },
  'mcp-insert-hint': { zh: '在 profile 补丁层（~/.dsh/profiles/dsh-tui/cordis.patch.yml）insert 一行即可，例：', en: 'Insert one line in the profile patch layer (~/.dsh/profiles/dsh-tui/cordis.patch.yml), e.g.:', ru: 'Добавьте одну строку в слой патча профиля (~/.dsh/profiles/dsh-tui/cordis.patch.yml), напр.:' },
  'mcp-readme-hint': { zh: '详见仓库 README 的 MCP 章节。', en: 'See the MCP section of the repo README.', ru: 'См. раздел MCP в README репозитория.' },
  'mcp-server-tools': { zh: '{{server}}（{{count}} 个工具）: {{tools}}', en: '{{server}} ({{count}} tools): {{tools}}', ru: '{{server}} ({{count}} инструментов): {{tools}}' },
  'child-stderr-line': { zh: '子进程 stderr: {{line}}', en: 'Subprocess stderr: {{line}}', ru: 'stderr дочернего процесса: {{line}}' },
  'child-stderr-line-repeat': { zh: '子进程 stderr: {{line}}（重复 {{count}} 次）', en: 'Subprocess stderr: {{line}} (repeated {{count}}×)', ru: 'stderr дочернего процесса: {{line}} (повторено {{count}}×)' },
  'export-title': { zh: '# dsh-tui 会话导出', en: '# dsh-tui session export', ru: '# экспорт сессии dsh-tui' },
  'export-time': { zh: '- 导出时间: {{time}}', en: '- Exported: {{time}}', ru: '- Экспортировано: {{time}}' },
  'export-model': { zh: '- 模型: {{model}}', en: '- Model: {{model}}', ru: '- Модель: {{model}}' },
  'export-session': { zh: '- 会话: {{id}}', en: '- Session: {{id}}', ru: '- Сессия: {{id}}' },
  'export-dir': { zh: '- 目录: {{cwd}}', en: '- Directory: {{cwd}}', ru: '- Каталог: {{cwd}}' },
  'mentions-attached': { zh: '已附加 {{count}} 个文件引用', en: { one: 'Attached {{count}} file reference', other: 'Attached {{count}} file references' }, ru: { one: 'Прикреплена {{count}} ссылка на файл', other: 'Прикреплено {{count}} ссылок на файлы' } },
  'mentions-missing': { zh: '未找到引用: {{paths}}', en: 'References not found: {{paths}}', ru: 'Ссылки не найдены: {{paths}}' },
  'transcript-image': { zh: '图片', en: 'Image', ru: 'Изображение' },
  'image-preview-previous': { zh: '上一张', en: 'Previous image', ru: 'Предыдущее изображение' },
  'image-preview-next': { zh: '下一张', en: 'Next image', ru: 'Следующее изображение' },
  'image-preview-open-original': { zh: '打开原图', en: 'Open original', ru: 'Открыть оригинал' },
  'image-preview-opening': { zh: '正在打开原图…', en: 'Opening original...', ru: 'Открываю оригинал…' },
  'image-preview-open-failed': { zh: '原图打开失败，点击重试', en: 'Could not open original; retry', ru: 'Не удалось открыть оригинал; повторите' },
  'image-preview-fit': { zh: '适应', en: 'Fit', ru: 'По размеру' },
  'image-preview-actual': { zh: '100% 原像素', en: 'Actual pixels (100%)', ru: 'Реальные пиксели (100%)' },
  'image-preview-no-metrics': { zh: '终端未报告字符格像素尺寸', en: 'Terminal cell pixel size unavailable', ru: 'Размер ячейки терминала в пикселях недоступен' },
  'image-preview-zoom-in': { zh: '放大', en: 'Zoom in', ru: 'Увеличить' },
  'image-preview-zoom-out': { zh: '缩小', en: 'Zoom out', ru: 'Уменьшить' },
  'image-preview-left': { zh: '向左平移', en: 'Pan left', ru: 'Влево' },
  'image-preview-right': { zh: '向右平移', en: 'Pan right', ru: 'Вправо' },
  'image-preview-up': { zh: '向上平移', en: 'Pan up', ru: 'Вверх' },
  'image-preview-down': { zh: '向下平移', en: 'Pan down', ru: 'Вниз' },
  'transcript-image-loading': { zh: '正在加载 {{name}}', en: 'Loading {{name}}', ru: 'Загрузка {{name}}' },
  'transcript-image-ready': { zh: '图片 · {{name}}', en: 'Image · {{name}}', ru: 'Изображение · {{name}}' },
  'transcript-image-unavailable': { zh: '无法预览 {{name}}', en: 'Cannot preview {{name}}', ru: 'Невозможно предпросмотреть {{name}}' },
  'transcript-image-message': { zh: '{{count}} 张图片', en: { one: '{{count}} image', other: '{{count}} images' }, ru: { one: '{{count}} изображение', other: '{{count}} изображений' } },
  'input-image-token-stale': { zh: '{{token}} 已失效，发送时不会附带图片', en: '{{token}} is no longer staged; no image will attach', ru: '{{token}} больше не подготовлен; изображение не будет прикреплено' },
  'input-images-staged': { zh: '已附加 {{count}} 张图片', en: { one: 'Attached {{count}} image', other: 'Attached {{count}} images' }, ru: { one: 'Прикреплено {{count}} изображение', other: 'Прикреплено {{count}} изображений' } },
  'send-failed': { zh: '发送失败 · {{err}}', en: 'Send failed · {{err}}', ru: 'Не удалось отправить · {{err}}' },
  'export-user-section': { zh: '## 用户', en: '## User', ru: '## Пользователь' },
  'export-thinking-section': { zh: '## 思考', en: '## Thinking', ru: '## Размышление' },
  'export-assistant-section': { zh: '## 助手', en: '## Assistant', ru: '## Ассистент' },
  'export-tool-section': { zh: '## 工具 · {{name}}', en: '## Tool · {{name}}', ru: '## Инструмент · {{name}}' },
  'export-result-section': { zh: '### 结果', en: '### Result', ru: '### Результат' },
  'agentsmd-project': { zh: '## 项目', en: '## Project', ru: '## Проект' },
  'agentsmd-project-body': { zh: '（在此描述项目的目标、结构与约定——这份文件会注入给每个 agent 作为工作区上下文。）', en: '(Describe the project\'s goals, structure and conventions here — this file is injected to every agent as workspace context.)', ru: '(Опишите здесь цели, структуру и соглашения проекта — этот файл внедряется в каждый агент как контекст рабочей области.)' },
  'agentsmd-conventions': { zh: '## 约定', en: '## Conventions', ru: '## Соглашения' },
  'agentsmd-convention-read': { zh: '- 改动前先阅读相关模块', en: '- Read the relevant modules before making changes', ru: '- Перед изменениями прочитайте соответствующие модули' },
  'agentsmd-convention-style': { zh: '- 保持与现有代码风格一致', en: '- Keep consistent with the existing code style', ru: '- Придерживайтесь существующего стиля кода' },
  'doctor-api-key': { zh: 'API key: {{state}}', en: 'API key: {{state}}', ru: 'API-ключ: {{state}}' },
  'doctor-key-configured-env': { zh: '已配置（环境变量）', en: 'configured (environment)', ru: 'настроен (переменная окружения)' },
  'doctor-key-configured-store': { zh: '已配置（DSH 凭据库）', en: 'configured (DSH credential store)', ru: 'настроен (хранилище учётных данных DSH)' },
  'doctor-key-missing': { zh: '未配置（环境变量与 DSH 凭据库中都没有 DEEPSEEK_API_KEY）', en: 'not configured (neither DEEPSEEK_API_KEY nor a DSH credential-store ref)', ru: 'не настроен (ни DEEPSEEK_API_KEY, ни ссылки в хранилище учётных данных DSH)' },
  'doctor-model': { zh: '模型: {{model}} · 提供方: {{provider}}', en: 'Model: {{model}} · Provider: {{provider}}', ru: 'Модель: {{model}} · Провайдер: {{provider}}' },
  'doctor-cwd': { zh: '工作目录: {{cwd}}', en: 'Working directory: {{cwd}}', ru: 'Рабочий каталог: {{cwd}}' },
  'doctor-context-window': { zh: '上下文窗口: {{window}} tokens', en: 'Context window: {{window}} tokens', ru: 'Окно контекста: {{window}} токенов' },
  'doctor-unknown': { zh: '未知', en: 'unknown', ru: 'неизвестно' },
  'doctor-session': { zh: '会话: {{id}}', en: 'Session: {{id}}', ru: 'Сессия: {{id}}' },
  'doctor-config': { zh: '配置: {{candidate}} {{state}}', en: 'Config: {{candidate}} {{state}}', ru: 'Конфигурация: {{candidate}} {{state}}' },
  'doctor-config-missing': { zh: '（不存在）', en: '(missing)', ru: '(отсутствует)' },
  'doctor-storage': { zh: '会话存储: {{dir}} {{state}}', en: 'Session storage: {{dir}} {{state}}', ru: 'Хранилище сессий: {{dir}} {{state}}' },
  'doctor-storage-uninit': { zh: '（未初始化）', en: '(not initialized)', ru: '(не инициализировано)' },
  'subagent-not-mounted': { zh: '子代理服务未挂载（leaf 未启用 subagent）', en: 'Subagent service not mounted (leaf has no subagent)', ru: 'Служба субагентов не подключена (leaf не включает subagent)' },
  'subagent-none': { zh: '当前会话暂无子代理', en: 'No subagents in the current session', ru: 'В текущей сессии нет субагентов' },
  'subagent-resumable': { zh: '可续', en: 'resumable', ru: 'возобновляемый' },
  'subagent-oneshot': { zh: '一次性', en: 'one-shot', ru: 'одноразовый' },
  'subagent-row': { zh: '{{mode}} {{label}}{{activity}} · {{id}}', en: '{{mode}} {{label}}{{activity}} · {{id}}', ru: '{{mode}} {{label}}{{activity}} · {{id}}' },
  'subagent-running': { zh: ' 运行中', en: ' running', ru: ' выполняется' },
  'subagent-archived': { zh: ' 已归档', en: ' archived', ru: ' в архиве' },
  'subagent-query-failed': { zh: '查询失败 · {{err}}', en: 'Query failed · {{err}}', ru: 'Не удалось выполнить запрос · {{err}}' },
  'subagent-tools': { zh: '工具', en: 'Tools', ru: 'Инструменты' },
  'subagent-status-running': { zh: '运行中', en: 'running', ru: 'выполняется' },
  'subagent-status-completed': { zh: '已完成', en: 'completed', ru: 'завершено' },
  'subagent-status-failed': { zh: '失败', en: 'failed', ru: 'ошибка' },
  'agent-preset-switched': { zh: 'Agent preset 已切换：{{preset}}', en: 'Agent preset switched: {{preset}}', ru: 'Пресет агента переключён: {{preset}}' },
  'context-low-warning': { zh: '上下文即将耗尽（剩余 {{percent}}%）· 运行 /clear 或新建会话', en: 'Context low ({{percent}}% remaining) · Run /clear or start a new session', ru: 'Контекст на исходе (осталось {{percent}}%) · Выполните /clear или начните новую сессию' },
  'rewind-unavailable': { zh: '回退不可用——会话服务未加载', en: 'Rewind unavailable — session services not loaded', ru: 'Откат недоступен — службы сессий не загружены' },
  'rewind-settling': { zh: '无法回退——回合仍在收尾，请稍候再试', en: 'Cannot rewind — the turn is still settling, try again in a moment', ru: 'Невозможно откатить — ход всё ещё завершается, попробуйте позже' },
  'rewind-fork-failed': { zh: '无法回退到该处 · {{err}}', en: 'Cannot rewind to this point · {{err}}', ru: 'Невозможно откатить к этой точке · {{err}}' },
  'rewind-create-failed': { zh: '回退失败——无法创建替代会话', en: 'Rewind failed — could not create the replacement session', ru: 'Откат не удался — не удалось создать замещающую сессию' },
  'rewind-attach-failed': { zh: '已回退，但工作区挂载失败 · {{err}}', en: 'Session rewound, but workspace attachment failed · {{err}}', ru: 'Сессия откачена, но подключение рабочей области не удалось · {{err}}' },
  'rewind-no-persistence': { zh: '回退不可用——持久化服务未加载', en: 'Rewind unavailable — session persistence not loaded', ru: 'Откат недоступен — служба сохранения сессий не загружена' },
  'rewind-load-failed': { zh: '无法读取该会话日志 · {{err}}', en: 'Could not read that session log · {{err}}', ru: 'Не удалось прочитать журнал этой сессии · {{err}}' },
  'rewind-first-message': { zh: '不能回退到第一条消息之前', en: 'Cannot rewind past the very first message', ru: 'Нельзя откатить раньше самого первого сообщения' },
  'rewind-noop': { zh: '该点之后没有可回退的内容', en: 'Nothing to rewind past this point', ru: 'После этой точки нечего откатывать' },
  'rewind-session-changed': { zh: '会话已切换，回退已放弃', en: 'The session changed; the rewind was dropped', ru: 'Сессия переключена; откат отменён' },
  'tree-unavailable': { zh: '会话树不可用——持久化服务未加载', en: 'Session tree unavailable — session persistence not loaded', ru: 'Дерево сессий недоступно — служба сохранения сессий не загружена' },
  'fork-unavailable': { zh: '分叉不可用——会话服务未加载', en: 'Fork unavailable — session services not loaded', ru: 'Ветвление недоступно — службы сессий не загружены' },
  'fork-while-working': { zh: '回合运行中，无法分叉会话', en: 'Cannot fork while a turn is running', ru: 'Невозможно создать ветку, пока выполняется ход' },
  'fork-failed': { zh: '分叉失败 · {{err}}', en: 'Fork failed · {{err}}', ru: 'Не удалось создать ветку · {{err}}' },
  'fork-create-failed': { zh: '分叉失败——无法创建分叉会话', en: 'Fork failed — could not create the forked session', ru: 'Ветвление не удалось — не удалось создать сессию-ветку' },
  'fork-attach-failed': { zh: '已分叉，但工作区挂载失败 · {{err}}', en: 'Session forked, but workspace attachment failed · {{err}}', ru: 'Ветка создана, но подключение рабочей области не удалось · {{err}}' },
  'fork-done': {
    zh: '已分叉（{{id}}）——仍在原会话中\n新进程进入分叉：{{command}}',
    en: 'Forked ({{id}}) — still in the original session\nEnter the fork in a new process: {{command}}',
    ru: 'Создана ветка ({{id}}) — вы всё ещё в исходной сессии\nПерейдите в ветку в новом процессе: {{command}}',
  },
  // ── /tree screen (session family tree) ─────────────────────────────────
  'tree-title': { zh: '会话树', en: 'Session tree', ru: 'Дерево сессий' },
  'tree-sessions': { zh: '会话', en: 'sessions', ru: 'сессии' },
  'tree-loading': { zh: '正在加载会话树…', en: 'Loading the session tree…', ru: 'Загрузка дерева сессий…' },
  'tree-rewinding': { zh: '正在分叉并切换…', en: 'Forking and switching…', ru: 'Создание ветки и переключение…' },
  'tree-empty': { zh: '没有可显示的条目', en: 'No entries to show', ru: 'Нет записей для отображения' },
  'tree-truncated': { zh: '已截断', en: 'truncated', ru: 'усечено' },
  'tree-search': { zh: '输入即搜索…', en: 'Type to search…', ru: 'Вводите для поиска…' },
  'tree-filter-default': { zh: '默认', en: 'default', ru: 'по умолчанию' },
  'tree-filter-no-tools': { zh: '无工具', en: 'no tools', ru: 'без инструментов' },
  'tree-filter-user-only': { zh: '仅用户', en: 'user only', ru: 'только пользователь' },
  'tree-filter-all': { zh: '全部', en: 'all', ru: 'все' },
  'tree-kind-user': { zh: '用户消息', en: 'user message', ru: 'сообщение пользователя' },
  'tree-kind-assistant': { zh: '助手回复', en: 'assistant message', ru: 'ответ ассистента' },
  'tree-kind-tool': { zh: '工具调用', en: 'tool call', ru: 'вызов инструмента' },
  'tree-kind-compact': { zh: '压缩检查点', en: 'compaction', ru: 'сжатие' },
  'tree-kind-interrupt': { zh: '中断', en: 'interrupt', ru: 'прерывание' },
  'tree-kind-notice': { zh: '通知', en: 'notice', ru: 'уведомление' },
  'tree-empty-fork': { zh: '（空分叉）', en: '(empty fork)', ru: '(пустая ветка)' },
  'tree-unreadable': { zh: '（日志无法读取）', en: '(unreadable log)', ru: '(журнал нечитаем)' },
  'tree-unloaded': { zh: '（超出预算未加载）', en: '(not loaded — over budget)', ru: '(не загружено — превышен лимит)' },
  'tree-first-message': { zh: '不能回退到第一条消息之前', en: 'Cannot rewind past the very first message', ru: 'Нельзя откатить раньше самого первого сообщения' },
  'tree-adopt-live': { zh: '当前会话就在这条分支上', en: 'The live session is already on this branch', ru: 'Активная сессия уже на этой ветке' },
  'tree-adopt-unavailable': { zh: '该分支无法整体切换（未加载到末端）', en: 'Cannot adopt this branch (its tip was not loaded)', ru: 'Невозможно переключиться на эту ветку (её конец не загружен)' },
  'tree-menu-rewind': { zh: '回退到这里', en: 'Rewind here', ru: 'Откатить сюда' },
  'tree-menu-rewind-detail': { zh: '丢弃该轮对话，提示词回到输入框', en: 'Drops that turn; its prompt returns to the input', ru: 'Отбрасывает этот ход; его запрос возвращается в поле ввода' },
  'tree-menu-fork': { zh: '从这分叉', en: 'Fork here', ru: 'Создать ветку здесь' },
  'tree-menu-fork-detail': { zh: '保留这条消息，从这里开新分支', en: 'Keeps this entry and branches here', ru: 'Сохраняет эту запись и создаёт ветку отсюда' },
  'tree-menu-adopt': { zh: '切换到该分支', en: 'Adopt this branch', ru: 'Переключиться на эту ветку' },
  'tree-menu-adopt-detail': { zh: '保留整条分支并切换过去', en: 'Switches to the whole branch, content kept', ru: 'Переключается на всю ветку с сохранением содержимого' },
  'tree-menu-cancel': { zh: '取消', en: 'Cancel', ru: 'Отмена' },
  'tree-confirm-rewind': { zh: '回退到「{{text}}」？', en: 'Rewind to "{{text}}"?', ru: 'Откатить к «{{text}}»?' },
  'tree-confirm-drop': { zh: '回退到「{{text}}」？该轮 {{n}} 条消息将丢弃', en: 'Rewind to "{{text}}"? Drops that turn ({{n}} entries)', ru: 'Откатить к «{{text}}»? Этот ход будет отброшен ({{n}} записей)' },
  'tree-confirm-adopt': { zh: '切换到「{{text}}」所在分支？', en: 'Switch to the branch of "{{text}}"?', ru: 'Переключиться на ветку «{{text}}»?' },
  'tree-confirm-drops-branch': { zh: '注意：该分支的全部内容都在这一轮里，回退后将看不到它们', en: 'Heads-up: this branch\u2019s whole content is that one turn — it disappears from the fork', ru: 'Внимание: всё содержимое этой ветки — это один ход, он исчезнет из ветки' },
  'tree-hint': {
    zh: '**Enter** 菜单 · **{{mod}}F** 从这分叉 · **{{mod}}B** 切到分支 · **{{mod}}O** 过滤 · 点击行出菜单 · 输入搜索 · Esc 退出',
    en: '**Enter** menu · **{{mod}}F** fork here · **{{mod}}B** adopt branch · **{{mod}}O** filter · click a row for the menu · type to search · Esc exits',
    ru: '**Enter** меню · **{{mod}}F** создать ветку здесь · **{{mod}}B** переключиться на ветку · **{{mod}}O** фильтр · клик по строке — меню · ввод для поиска · Esc выход',
  },
  'tree-hint-short': { zh: '**Enter** 菜单 · 点击行出菜单 · Esc 退出', en: '**Enter** menu · click a row · Esc exits', ru: '**Enter** меню · клик по строке · Esc выход' },
  'tree-hint-menu': { zh: '**↑↓** 选择 · **Enter** 执行 · 首字母直达 · Esc 返回', en: '**↑↓** move · **Enter** run · letter keys jump · Esc back', ru: '**↑↓** перемещение · **Enter** выполнить · буквенные клавиши — переход · Esc назад' },
  'tree-hint-confirm': { zh: '**Enter** 确认 · Esc 取消', en: '**Enter** to confirm · Esc to cancel', ru: '**Enter** подтвердить · Esc отменить' },
  'tree-refused': { zh: '操作未执行（原因已记录到会话通知）', en: 'Not executed — the reason was notified to the conversation', ru: 'Не выполнено — причина зафиксирована в уведомлении сессии' },
  'tree-rewind-failed': { zh: '操作失败 · {{message}}', en: 'Action failed · {{message}}', ru: 'Не удалось выполнить действие · {{message}}' },
  'tree-rewound': { zh: '已回退——编辑后重新发送', en: 'Earlier turn restored — edit your message to continue', ru: 'Предыдущий ход восстановлен — отредактируйте сообщение, чтобы продолжить' },
  'tree-forked': { zh: '已从此处分叉', en: 'Forked from this point', ru: 'Ветка создана от этой точки' },
  'tree-adopted': { zh: '已切换到该分支', en: 'Switched to that branch', ru: 'Переключено на эту ветку' },
  'tree-preview-title': { zh: '预览', en: 'Preview', ru: 'Предпросмотр' },
  'tree-branch-live': { zh: '当前会话', en: 'live session', ru: 'активная сессия' },
  'resume-while-working': { zh: '回合运行中，无法恢复会话', en: 'Cannot resume while a turn is running', ru: 'Невозможно возобновить, пока выполняется ход' },
  'resume-unavailable': { zh: '恢复不可用——agents 服务未加载', en: 'Resume unavailable — agents service not loaded', ru: 'Возобновление недоступно — служба agents не загружена' },
  'resume-failed': { zh: '恢复失败 · {{err}}', en: 'Resume failed · {{err}}', ru: 'Не удалось возобновить · {{err}}' },
  'resume-attach-failed': { zh: '已恢复会话，但工作区挂载失败 · {{err}}', en: 'Session resumed, but workspace attachment failed · {{err}}', ru: 'Сессия возобновлена, но подключение рабочей области не удалось · {{err}}' },
  'resume-session-changed': { zh: '会话已切换，恢复已放弃', en: 'The session changed; the resume was dropped', ru: 'Сессия переключена; возобновление отменено' },
  'new-session-while-working': { zh: '回合运行中，无法新建会话', en: 'Cannot start a new session while a turn is running', ru: 'Невозможно начать новую сессию, пока выполняется ход' },
  'new-session-unavailable': { zh: '新建会话不可用——agents 服务未加载', en: 'New session unavailable — agents service not loaded', ru: 'Новая сессия недоступна — служба agents не загружена' },
  'new-session-failed': { zh: '新建会话失败 · {{err}}', en: 'New session failed · {{err}}', ru: 'Не удалось создать новую сессию · {{err}}' },
  'new-session-attach-failed': { zh: '会话已创建，但工作区挂载失败 · {{err}}', en: 'Session created, but workspace attachment failed · {{err}}', ru: 'Сессия создана, но подключение рабочей области не удалось · {{err}}' },
  'model-switch-while-working': { zh: '回合运行中，无法切换模型', en: 'Cannot switch models while a turn is running', ru: 'Невозможно переключить модель, пока выполняется ход' },
  'model-switch-unavailable': { zh: '模型切换不可用——会话服务未加载', en: 'Model switch unavailable — session services not loaded', ru: 'Переключение модели недоступно — службы сессий не загружены' },
  'model-switch-fork-failed': { zh: '无法切换模型 · {{err}}', en: 'Cannot switch models · {{err}}', ru: 'Невозможно переключить модель · {{err}}' },
  'model-switch-failed': { zh: '模型切换失败 · {{err}}', en: 'Model switch failed · {{err}}', ru: 'Не удалось переключить модель · {{err}}' },
  'model-switch-attach-failed': { zh: '模型已切换，但工作区挂载失败 · {{err}}', en: 'Model switched, but workspace attachment failed · {{err}}', ru: 'Модель переключена, но подключение рабочей области не удалось · {{err}}' },
  'model-usage': { zh: '用法：/model <provider/model>（如 deepseek/deepseek-flash）', en: 'Usage: /model <provider/model> (e.g. deepseek/deepseek-flash)', ru: 'Использование: /model <provider/model> (напр. deepseek/deepseek-flash)' },
  'model-unknown': { zh: '未知模型「{{spec}}」· /model 查看全部', en: 'Unknown model "{{spec}}" · /model to view all', ru: 'Неизвестная модель «{{spec}}» · /model для просмотра всех' },
  'compact-unavailable': { zh: '压缩不可用——当前 leaf 没有压缩服务', en: 'Compaction unavailable · no compaction service in this leaf', ru: 'Сжатие недоступно · в этом leaf нет службы сжатия' },
  'compact-while-working': { zh: '回合运行中，无法压缩会话', en: 'Cannot compact while a turn is running', ru: 'Невозможно сжать, пока выполняется ход' },
  'compact-working': { zh: '正在压缩会话…', en: 'Summarizing earlier turns…', ru: 'Сжатие предыдущих ходов…' },
  'compact-done': { zh: '会话已压缩', en: 'Session summary is ready', ru: 'Сжатие сессии готово' },
  'compact-nothing': { zh: '没有可压缩的内容', en: 'Nothing to compact', ru: 'Нечего сжимать' },
  'compact-failed': { zh: '压缩失败 · {{err}}', en: 'Compaction failed · {{err}}', ru: 'Не удалось сжать · {{err}}' },
  'compact-flush-failed': {
    zh: '压缩已生效，但落盘检查失败——历史已由摘要替代，请留意会话状态',
    en: 'Compaction took effect, but its durability flush failed — history is now the summary',
    ru: 'Сжатие вступило в силу, но сброс на диск не удался — история теперь заменена сводкой',
  },
  'compact-cancelled-switch': {
    zh: '压缩进行中，已取消并切换会话',
    en: 'In-flight compaction cancelled for the session switch',
    ru: 'Текущее сжатие отменено из-за переключения сессии',
  },
  'turn-failed': { zh: '回合出错{{detail}}', en: 'Turn error{{detail}}', ru: 'Ошибка хода{{detail}}' },

  // ── dsh-adapter/promptDebug.ts（/debug-prompt 成功提示）─────────────
  // 快照 0600 落在会话工作区根，与 export-saved 同一句清理提醒。
  'prompt-debug-saved': {
    zh: '已写入 {{count}} 条最终 LLM 请求快照到 {{file}}。快照含敏感会话与提示词数据；文件位于当前工作区，若工作区在同步/共享目录请注意清理。',
    en: {
      one: 'Wrote 1 final LLM request snapshot to {{file}}. It contains sensitive conversation and prompt data, and lives in the current workspace — clean it up promptly if the workspace is synced or shared.',
      other: 'Wrote {{count}} final LLM request snapshots to {{file}}. It contains sensitive conversation and prompt data, and lives in the current workspace — clean it up promptly if the workspace is synced or shared.',
    },
    ru: {
      one: 'Записан 1 финальный снимок LLM-запроса в {{file}}. Он содержит конфиденциальные данные переписки и промпта и находится в текущей рабочей области — удалите его при необходимости, если область синхронизируется или общедоступна.',
      other: 'Записано {{count}} финальных снимков LLM-запроса в {{file}}. Они содержат конфиденциальные данные переписки и промпта и находятся в текущей рабочей области — удалите их при необходимости, если область синхронизируется или общедоступна.',
    },
  },

  // ── questions.ts ─────────────────────────────────────────────────────
  'questionnaire-answered': { zh: '📋 问卷已答 · {{total}} 题', en: '📋 Questionnaire answered · {{total}} questions', ru: '📋 Анкета заполнена · {{total}} вопросов' },

  // ── utils/loaded-context.ts ─────────────────────────────────────────
  'context-truncated': { zh: '…（已截断）', en: '… (truncated)', ru: '… (усечено)' },
  'context-sections': { zh: '系统提示词 {{n}} 段', en: 'System prompt {{n}} sections', ru: 'Системный промпт, {{n}} разделов' },
  'context-files': { zh: '工作区指令 ×{{n}}', en: 'Workspace instructions ×{{n}}', ru: 'Инструкции рабочей области ×{{n}}' },
  'context-runtime': { zh: '运行时上下文 {{n}} 项', en: 'Runtime context {{n}} items', ru: 'Контекст времени выполнения, {{n}} элементов' },
  'context-skills': { zh: '技能 {{n}}', en: 'Skills {{n}}', ru: 'Навыки {{n}}' },
  'context-tools': { zh: '工具 {{n}}', en: 'Tools {{n}}', ru: 'Инструменты {{n}}' },

  // ── screens/Chat.tsx ────────────────────────────────────────────────
  'skill-unavailable': { zh: '技能 {{name}} 已不可用或未开放用户直调', en: 'Skill {{name}} is gone or not user-invocable', ru: 'Навык {{name}} недоступен или не предназначен для прямого вызова пользователем' },
  'context-loaded': { zh: '已加载上下文', en: 'Context loaded', ru: 'Контекст загружен' },
  'context-panel-expand': { zh: ' 展开', en: ' to expand', ru: ' развернуть' },
  'context-panel-collapse': { zh: ' 折叠', en: ' to collapse', ru: ' свернуть' },
  'copied-chars': { zh: '已复制 {{n}} 个字符', en: 'Copied {{n}} characters', ru: 'Скопировано {{n}} символов' },
  'activity-current-preset': { zh: '当前预设  {{name}}', en: 'Current preset  {{name}}', ru: 'Текущий пресет  {{name}}' },
  'activity-switch-hint': { zh: '切换      /activity（选择器）或 /activity frames <名>', en: 'Switch      /activity (picker) or /activity frames <name>', ru: 'Переключить      /activity (выборщик) или /activity frames <имя>' },
  'activity-persist-hint': { zh: '持久化    ~/.dsh-tui/working-activity.json（重启后仍生效）', en: 'Persisted    ~/.dsh-tui/working-activity.json (survives restart)', ru: 'Сохраняется    ~/.dsh-tui/working-activity.json (сохраняется после перезапуска)' },
  'activity-current-direct': { zh: '当前预设：{{name}} · /activity frames <名> 直接切换：', en: 'Current preset: {{name}} · /activity frames <name> to switch directly:', ru: 'Текущий пресет: {{name}} · /activity frames <имя> для прямого переключения:' },
  'activity-random-each': { zh: '每次随机', en: 'random each time', ru: 'каждый раз случайно' },
  'activity-current-marker': { zh: '  ← 当前', en: '  ← current', ru: '  ← текущий' },
  'activity-usage': { zh: '用法：/activity | /activity frames <名> | /activity status', en: 'Usage: /activity | /activity frames <name> | /activity status', ru: 'Использование: /activity | /activity frames <имя> | /activity status' },
  'preset-current': { zh: '当前 preset  {{name}}', en: 'Current preset  {{name}}', ru: 'Текущий пресет  {{name}}' },
  'preset-roster-missing': { zh: '（未挂载名册）', en: '(roster not mounted)', ru: '(список не подключён)' },
  'preset-switch-hint': { zh: '切换        /preset（选择器）或 /preset <id>', en: 'Switch        /preset (picker) or /preset <id>', ru: 'Переключить        /preset (выборщик) или /preset <id>' },
  'preset-persist-hint': { zh: '持久化      ~/.dsh-tui/agent-preset.json（重启后仍生效；cordis.yml preset 优先）', en: 'Persisted      ~/.dsh-tui/agent-preset.json (survives restart; cordis.yml preset wins)', ru: 'Сохраняется      ~/.dsh-tui/agent-preset.json (сохраняется после перезапуска; приоритет у cordis.yml preset)' },
  'preset-lock-hint': { zh: '锁定规则    已开始的会话不可切换（官方 blank-only 规则）', en: 'Lock rule     started sessions cannot switch (official blank-only rule)', ru: 'Правило блокировки     начатые сессии нельзя переключить (официальное правило blank-only)' },
  'preset-roster-unmounted': { zh: '当前组合未挂载 agent-presets 名册（preset 不可用）', en: 'The agent-presets roster is not mounted (presets unavailable)', ru: 'В текущей комбинации не подключён список agent-presets (пресеты недоступны)' },
  'theme-current': { zh: '当前主题  {{name}}', en: 'Current theme  {{name}}', ru: 'Текущая тема  {{name}}' },
  'theme-switch-hint': { zh: '切换      /theme（选择器）或 /theme <名字>', en: 'Switch      /theme (picker) or /theme <name>', ru: 'Переключить      /theme (выборщик) или /theme <имя>' },
  'theme-persist-hint': { zh: '持久化    ~/.dsh-tui/theme.json（重启后仍生效；DSH_TUI_THEME 优先）', en: 'Persisted    ~/.dsh-tui/theme.json (survives restart; DSH_TUI_THEME wins)', ru: 'Сохраняется    ~/.dsh-tui/theme.json (сохраняется после перезапуска; приоритет у DSH_TUI_THEME)' },
  'theme-custom-hint': { zh: '自定义    静态 ~/.dsh-tui/themes/<名字>.json（插件也可提供运行时主题；见 README「自定义主题」）', en: 'Custom      static ~/.dsh-tui/themes/<name>.json (plugins may also provide runtime themes; see README "Custom themes")', ru: 'Своя      статический файл ~/.dsh-tui/themes/<имя>.json (плагины также могут предоставлять темы времени выполнения; см. README «Custom themes»)' },
  'theme-auto-resolved': { zh: '自动解析  当前为 {{name}}（跟随终端背景）', en: 'Auto-resolved  currently {{name}} (follows terminal background)', ru: 'Авторазрешение  сейчас {{name}} (следует за фоном терминала)' },
  'theme-switched-saved': { zh: '主题已切换：{{name}}（已保存）', en: 'Theme switched: {{name}} (saved)', ru: 'Тема переключена: {{name}} (сохранено)' },
  'theme-unknown': { zh: '未知主题「{{name}}」· /theme 查看全部', en: 'Unknown theme "{{name}}" · /theme to view all', ru: 'Неизвестная тема «{{name}}» · /theme для просмотра всех' },
  'status-model': { zh: '模型   {{model}}', en: 'Model   {{model}}', ru: 'Модель   {{model}}' },
  'status-working': { zh: '工作中', en: 'working', ru: 'работает' },
  'status-idle': { zh: '空闲', en: 'idle', ru: 'ожидание' },
  'status-state': { zh: '状态   {{state}}', en: 'Status   {{state}}', ru: 'Состояние   {{state}}' },
  'status-session': { zh: '会话   {{id}}', en: 'Session   {{id}}', ru: 'Сессия   {{id}}' },
  'status-dir': { zh: '目录   {{cwd}}', en: 'Directory   {{cwd}}', ru: 'Каталог   {{cwd}}' },
  'workspace-picker-title': { zh: '工作区', en: 'Workspace', ru: 'Рабочая область' },
  'workspace-picker-hint': { zh: '**Enter** 切换并新建会话 · Esc 退出 · 也可输入 /workspace open <路径或 URI>', en: '**Enter** switch and start a new session · Esc to exit · or type /workspace open <path-or-URI>', ru: '**Enter** переключить и начать новую сессию · Esc выход · или введите /workspace open <путь-или-URI>' },
  'workspace-none': { zh: '没有可用工作区', en: 'No workspaces available', ru: 'Нет доступных рабочих областей' },
  'workspace-list-failed': { zh: '读取工作区失败 · {{err}}', en: 'Failed to list workspaces · {{err}}', ru: 'Не удалось получить список рабочих областей · {{err}}' },
  'workspace-uri-invalid': { zh: '无法解析工作区目标：{{uri}}', en: 'Cannot resolve workspace target: {{uri}}', ru: 'Невозможно разрешить цель рабочей области: {{uri}}' },
  'workspace-uri-failed': { zh: '加载工作区失败 · {{err}}', en: 'Failed to load workspace · {{err}}', ru: 'Не удалось загрузить рабочую область · {{err}}' },
  'workspace-switch-working': { zh: 'Agent 运行中，无法切换工作区', en: 'Cannot switch workspaces while the agent is running', ru: 'Невозможно переключить рабочие области, пока агент выполняется' },
  'workspace-open-invalid': { zh: '无法打开工作区：{{target}} 不是存在的目录', en: 'Cannot open workspace: {{target}} is not an existing directory', ru: 'Невозможно открыть рабочую область: {{target}} не является существующим каталогом' },
  'workspace-switched': { zh: '已切换工作区：{{target}}', en: 'Workspace switched: {{target}}', ru: 'Рабочая область переключена: {{target}}' },
  'workspace-flow-hint': { zh: '**Enter** 选择 · Esc 退出', en: '**Enter** select · Esc to exit', ru: '**Enter** выбрать · Esc выход' },
  'workspace-flow-edit-hint': { zh: '**Enter** 选择当前目录 · Tab 手动输入路径 · Esc 退出', en: '**Enter** select current directory · Tab enter a path · Esc to exit', ru: '**Enter** выбрать текущий каталог · Tab ввести путь · Esc выход' },
  'workspace-flow-input-hint': { zh: '输入绝对路径 · **Enter** 读取目录 · Esc 返回', en: 'Enter an absolute path · **Enter** load directory · Esc back', ru: 'Введите абсолютный путь · **Enter** загрузить каталог · Esc назад' },
  'workspace-flow-input-empty': { zh: '目录路径不能为空', en: 'Directory path cannot be empty', ru: 'Путь к каталогу не может быть пустым' },
  'workspace-flow-loading': { zh: '正在连接并读取目录… · Esc 关闭', en: 'Connecting and loading directories… · Esc to close', ru: 'Подключение и загрузка каталогов… · Esc закрыть' },
  'workspace-menu-title': { zh: 'Workspace 操作', en: 'Workspace actions', ru: 'Действия с рабочей областью' },
  'workspace-menu-resume-desc': { zh: '切换到另一个工作区', en: 'Switch to another workspace', ru: 'Переключиться на другую рабочую область' },
  'workspace-menu-rename-desc': { zh: '重命名当前工作区（需输入名称）', en: 'Rename the current workspace (needs a name)', ru: 'Переименовать текущую рабочую область (нужно ввести имя)' },
  'workspace-menu-open-desc': { zh: '打开路径或工作区 URI（需输入路径）', en: 'Open a path or workspace URI (needs a path)', ru: 'Открыть путь или URI рабочей области (нужно ввести путь)' },
  'workspace-open-usage': { zh: '用法：/workspace open <路径或 URI>', en: 'Usage: /workspace open <path-or-URI>', ru: 'Использование: /workspace open <путь-или-URI>' },
  'workspace-rename-usage': { zh: '用法：/workspace rename <名称>', en: 'Usage: /workspace rename <name>', ru: 'Использование: /workspace rename <имя>' },
  'workspace-command-unknown': { zh: '未知的 workspace 子命令：{{command}}', en: 'Unknown workspace subcommand: {{command}}', ru: 'Неизвестная подкоманда workspace: {{command}}' },
  'workspace-command-empty': { zh: '该 workspace 操作没有可选目标', en: 'This workspace action has no available targets', ru: 'У этого действия workspace нет доступных целей' },
  'workspace-command-failed': { zh: 'workspace 操作失败 · {{err}}', en: 'Workspace action failed · {{err}}', ru: 'Не удалось выполнить действие workspace · {{err}}' },
  'workspace-renamed': { zh: '工作区已重命名：{{title}}', en: 'Workspace renamed: {{title}}', ru: 'Рабочая область переименована: {{title}}' },
  'workspace-rename-failed': { zh: '工作区重命名失败 · {{err}}', en: 'Failed to rename workspace · {{err}}', ru: 'Не удалось переименовать рабочую область · {{err}}' },
  'cost-cache-rate': { zh: '缓存率 {{rate}}% · {{read}} 读 / {{write}} 写', en: 'Cache rate {{rate}}% · {{read}} read / {{write}} write', ru: 'Частота кеша {{rate}}% · {{read}} чтение / {{write}} запись' },
  'cost-context': { zh: '上下文 {{pct}}%', en: 'Context {{pct}}%', ru: 'Контекст {{pct}}%' },
  'status-title': { zh: '标题   {{title}}', en: 'Title   {{title}}', ru: 'Заголовок   {{title}}' },
  'cost-cache-hit-rate': { zh: '缓存命中率 {{rate}}% · 缓存 {{read}} 读 / {{write}} 写', en: 'Cache hit rate {{rate}}% · cache {{read}} read / {{write}} write', ru: 'Частота попаданий в кеш {{rate}}% · кеш {{read}} чтение / {{write}} запись' },
  'cost-note': { zh: '注：DSH 不提供 API 费用计量，以上为 token 用量（按 provider 账单计费）', en: 'Note: DSH provides no API cost metering; the above is token usage (billed by your provider)', ru: 'Примечание: DSH не предоставляет счётчика стоимости API; выше — расход токенов (тарифицируется вашим провайдером)' },
  'status-cost-label': { zh: '≈', en: '≈', ru: '≈' },
  'status-cost-note': { zh: '估算（官方单价，非账单）', en: 'estimate (official rates, not a bill)', ru: 'оценка (официальные ставки, не счёт)' },
  // 高峰/空闲时段名（用户玩梗命名：高峰=梁文峰，低谷=梁文谷）
  'cost-peak-name': { zh: '梁文峰', en: 'peak', ru: 'пик' },
  'cost-idle-name': { zh: '梁文谷', en: 'idle', ru: 'спад' },
  // 状态栏字段上的当前时段短标记（峰/谷）
  'cost-now-peak': { zh: '峰', en: 'peak', ru: 'пик' },
  'cost-now-idle': { zh: '谷', en: 'idle', ru: 'спад' },
  // /balance：DeepSeek 官方余额查询（BalanceReportRow 组件）
  'balance-summary-loading': { zh: 'DeepSeek 余额 · 查询中…', en: 'DeepSeek balance · querying…', ru: 'Баланс DeepSeek · запрос…' },
  'balance-summary-ok': { zh: 'DeepSeek 余额 ¥{{total}} · {{state}}', en: 'DeepSeek balance ¥{{total}} · {{state}}', ru: 'Баланс DeepSeek ¥{{total}} · {{state}}' },
  'balance-summary-state-ok': { zh: '可用', en: 'available', ru: 'доступно' },
  'balance-summary-state-off': { zh: '不可用', en: 'unavailable', ru: 'недоступно' },
  'balance-summary-fail': { zh: 'DeepSeek 余额 · 查询失败', en: 'DeepSeek balance · query failed', ru: 'Баланс DeepSeek · запрос не удался' },
  'balance-currency': { zh: '{{currency}} 总额 ¥{{total}} · 赠送 ¥{{granted}} · 充值 ¥{{toppedUp}}', en: '{{currency}} total ¥{{total}} · granted ¥{{granted}} · topped up ¥{{toppedUp}}', ru: '{{currency}} всего ¥{{total}} · подарено ¥{{granted}} · пополнено ¥{{toppedUp}}' },
  'balance-no-key': { zh: '未配置 DeepSeek API key（DEEPSEEK_API_KEY）', en: 'No DeepSeek API key configured (DEEPSEEK_API_KEY)', ru: 'Ключ DeepSeek API не настроен (DEEPSEEK_API_KEY)' },
  'balance-unauthorized': { zh: '认证失败——key 无效或已被撤销', en: 'Authentication failed — the key is invalid or revoked', ru: 'Ошибка аутентификации — ключ недействителен или отозван' },
  'balance-network-error': { zh: '网络错误或请求超时', en: 'Network error or request timeout', ru: 'Сетевая ошибка или истекло время запроса' },
  'balance-http-error': { zh: '余额接口返回 HTTP {{status}}', en: 'Balance endpoint returned HTTP {{status}}', ru: 'Конечная точка баланса вернула HTTP {{status}}' },
  'balance-invalid': { zh: '余额接口响应格式异常', en: 'Unexpected balance endpoint response', ru: 'Неожиданный ответ конечной точки баланса' },
  'balance-fail-hint': { zh: '仅 DeepSeek 官方 API key 可查询；/login 可查看凭据状态', en: 'Only a DeepSeek official API key can be queried; /login shows credential status', ru: 'Запрашивать можно только по официальному ключу DeepSeek API; /login показывает состояние учётных данных' },
  'balance-hover-tokens': { zh: '本会话 tokens {{input}} in → {{output}} out · ≈¥{{cost}}（{{peakName}} ¥{{peak}} / {{idleName}} ¥{{idle}}）', en: 'Session tokens {{input}} in → {{output}} out · ≈¥{{cost}} ({{peakName}} ¥{{peak}} / {{idleName}} ¥{{idle}})', ru: 'Токены сессии {{input}} вход → {{output}} выход · ≈¥{{cost}} ({{peakName}} ¥{{peak}} / {{idleName}} ¥{{idle}})' },
  'balance-current-rate': { zh: '当前时段：{{name}} · 输入 ¥{{input}}/百万 · 输出 ¥{{output}}/百万', en: 'Current window: {{name}} · input ¥{{input}}/M · output ¥{{output}}/M', ru: 'Текущее окно: {{name}} · вход ¥{{input}}/млн · выход ¥{{output}}/млн' },
  'balance-refresh': { zh: '点击刷新', en: 'click to refresh', ru: 'нажмите для обновления' },
  'balance-retry': { zh: '点击重试', en: 'click to retry', ru: 'нажмите для повтора' },
  'balance-close': { zh: '关闭', en: 'dismiss', ru: 'закрыть' },
  'balance-hint': { zh: '余额查询免费 · 以 DeepSeek 平台为准', en: 'balance queries are free · authoritative on the DeepSeek platform', ru: 'запросы баланса бесплатны · источник истины — платформа DeepSeek' },
  'doctor-example-config': { zh: '示例配置  {{path}}', en: 'Example config  {{path}}', ru: 'Пример конфигурации  {{path}}' },
  'doctor-user-config': { zh: '用户配置  {{path}}', en: 'User config  {{path}}', ru: 'Пользовательская конфигурация  {{path}}' },
  'doctor-launch-hint': { zh: '启动方式  dsh-tui.cmd / dsh --profile dsh-tui', en: 'Launch      dsh-tui.cmd / dsh --profile dsh-tui', ru: 'Запуск      dsh-tui.cmd / dsh --profile dsh-tui' },
  'doctor-route-hint': { zh: '模型路由  由 cordis.yml 的 llm-deepseek 段决定（/model 仅提示重启生效）', en: 'Model route  set by the llm-deepseek block in cordis.yml (/model only hints at restart)', ru: 'Маршрут модели   задаётся блоком llm-deepseek в cordis.yml (/model только намекает на перезапуск)' },
  'export-failed': { zh: '导出失败（无法写入工作目录）', en: 'Export failed (cannot write to working directory)', ru: 'Не удалось экспортировать (невозможно записать в рабочий каталог)' },
  // 导出/调试快照都落在会话工作区根：同步盘（Dropbox/网盘）或共享目录
  // 会把含完整对话的文件带出本机，提示语提醒用户及时清理。
  'export-saved': { zh: '已导出: {{target}}（文件位于当前工作区，若工作区在同步/共享目录请注意清理）', en: 'Exported: {{target}} (the file lives in the current workspace — clean it up promptly if the workspace is synced or shared)', ru: 'Экспортировано: {{target}} (файл находится в текущей рабочей области — удалите его при необходимости, если область синхронизируется или общедоступна)' },
  'agentsmd-create-failed': { zh: '创建 AGENTS.md 失败', en: 'Failed to create AGENTS.md', ru: 'Не удалось создать AGENTS.md' },
  'agentsmd-exists': { zh: 'AGENTS.md 已存在，未覆盖', en: 'AGENTS.md already exists, not overwritten', ru: 'AGENTS.md уже существует, не перезаписан' },
  'agentsmd-created': { zh: '已创建 {{result}}', en: 'Created {{result}}', ru: 'Создано {{result}}' },
  'login-api-key': { zh: 'API key: {{status}}', en: 'API key: {{status}}', ru: 'API-ключ: {{status}}' },
  'login-key-configured': { zh: '已配置（{{ref}}）', en: 'configured ({{ref}})', ru: 'настроен ({{ref}})' },
  'login-key-missing': { zh: '未配置（DEEPSEEK_API_KEY）', en: 'not configured (DEEPSEEK_API_KEY)', ru: 'не настроен (DEEPSEEK_API_KEY)' },
  'login-credentials-unavailable': { zh: '无法检查（credentials service 不可用）', en: 'unavailable (credentials service unavailable)', ru: 'недоступно (служба учётных данных недоступна)' },
  'login-credential-source': { zh: '凭据来源: {{source}}', en: 'Credential source: {{source}}', ru: 'Источник учётных данных: {{source}}' },
  'login-source-none': { zh: '无', en: 'none', ru: 'нет' },
  'login-credential-storage': { zh: '凭据存储: {{mode}}', en: 'Credential storage: {{mode}}', ru: 'Хранилище учётных данных: {{mode}}' },
  'login-storage-writable': { zh: '可写', en: 'writable', ru: 'доступно для записи' },
  'login-storage-read-only': { zh: '只读', en: 'read-only', ru: 'только чтение' },
  'login-base-url': { zh: 'Base URL: {{url}}', en: 'Base URL: {{url}}', ru: 'Базовый URL: {{url}}' },
  'login-official-endpoint': { zh: '官方端点', en: 'official endpoint', ru: 'официальная конечная точка' },
  'login-logout-hint': { zh: '使用 /provider 管理 DSH 凭据；若来源为 env，请删除对应环境变量并重启 dsh-tui', en: 'Manage DSH credentials with /provider; for env sources, remove the corresponding environment variable and restart dsh-tui', ru: 'Управляйте учётными данными DSH через /provider; для источников env удалите соответствующую переменную окружения и перезапустите dsh-tui' },
  // /login 的 OAuth 账号状态段（dsh-auth 类插件挂载时追加）
  'login-oauth-heading': { zh: '订阅账号（OAuth）:', en: 'Subscriptions (OAuth):', ru: 'Подписки (OAuth):' },
  'login-oauth-row': { zh: '  {{provider}} — {{state}}', en: '  {{provider}} — {{state}}', ru: '  {{provider}} — {{state}}' },
  'login-oauth-in': { zh: '已登录 · 令牌到期 {{time}}', en: 'signed in · token expires {{time}}', ru: 'выполнен вход · срок действия токена {{time}}' },
  'login-oauth-expired': { zh: '已登录但令牌已过期，重新登录可恢复', en: 'signed in but the token expired — sign in again to restore', ru: 'выполнен вход, но срок действия токена истёк — войдите снова, чтобы восстановить' },
  'login-oauth-signed-out': { zh: '未登录', en: 'not signed in', ru: 'не выполнен вход' },
  'login-oauth-hint': { zh: '  登录/登出：/provider 订阅账号登录，或 /auth login <provider>', en: '  Sign in/out: /provider subscription sign-in, or /auth login <provider>', ru: '  Вход/выход: вход по подписке через /provider или /auth login <provider>' },
  'permission-policy-hint': { zh: 'DSH 权限策略由 fs-policy / bash-sandbox 配置决定（当前 leaf：workspace 内读写、写入需已读文件）。', en: 'DSH permission policy is set by fs-policy / bash-sandbox config (current leaf: read/write in workspace, writes need a prior read).', ru: 'Политика прав DSH определяется конфигурацией fs-policy / bash-sandbox (текущий leaf: чтение/запись в рабочей области, запись требует предварительного чтения).' },
  'permission-approval-hint': { zh: '审批通道已挂载：命令申请权限提升（sandbox_permissions）时弹出审批条，Yes 放行一次、No / Esc 拒绝。', en: 'The approval channel is mounted: sandbox escalations (sandbox_permissions) raise an approval bar — Yes allows once, No / Esc rejects.', ru: 'Канал утверждения подключён: повышения прав sandbox (sandbox_permissions) вызывают строку утверждения — «Да» разрешает один раз, «Нет»/Esc отклоняет.' },
  'permission-root-hint': { zh: '当前文件系统策略以工作目录为根：{{cwd}}', en: 'Current filesystem policy is rooted at the working directory: {{cwd}}', ru: 'Текущая политика файловой системы привязана к рабочему каталогу: {{cwd}}' },
  'permission-path-hint': { zh: '模型工具相对路径均解析自该目录；跨目录访问由 fs-policy 拦截。', en: 'Relative paths of model tools resolve from this directory; cross-directory access is blocked by fs-policy.', ru: 'Относительные пути инструментов модели разрешаются из этого каталога; доступ между каталогами блокируется fs-policy.' },
  'permission-current': { zh: '当前预设  {{name}}', en: 'Current preset  {{name}}', ru: 'Текущий пресет  {{name}}' },
  'permission-roster-unavailable': { zh: '权限预设名册不可用', en: 'Permission preset roster unavailable', ru: 'Список пресетов прав недоступен' },
  'permission-picker-title': { zh: '权限预设', en: 'Permission preset', ru: 'Пресет прав' },
  'permission-preset-readonly': { zh: '只读', en: 'Read-only', ru: 'Только чтение' },
  'permission-preset-readonly-desc': { zh: '会话只读：不写文件、不执行命令', en: 'Read-only session: no file writes, no commands', ru: 'Сессия только для чтения: без записи файлов, без команд' },
  'permission-preset-workspace-write': { zh: '工作区读写', en: 'Workspace read/write', ru: 'Чтение/запись в рабочей области' },
  'permission-preset-workspace-write-desc': { zh: '工作区内读写；写入需先读该文件', en: 'Read/write inside the workspace; writes need a prior read', ru: 'Чтение/запись внутри рабочей области; запись требует предварительного чтения' },
  'permission-preset-full-access': { zh: '完全访问', en: 'Full access', ru: 'Полный доступ' },
  'permission-preset-full-access-desc': { zh: '不受限读写，无需审批', en: 'Unrestricted access, no approvals', ru: 'Неограниченный доступ, без утверждения' },
  'plan-picker-title': { zh: '计划模式', en: 'Plan mode', ru: 'Режим планирования' },
  'plan-mode-on': { zh: '开启', en: 'On', ru: 'Включён' },
  'plan-mode-on-desc': { zh: '进入计划模式：只读，先规划后动手', en: 'Enter plan mode: read-only, plan before acting', ru: 'Войти в режим планирования: только чтение, сначала план, потом действие' },
  'plan-mode-off': { zh: '关闭', en: 'Off', ru: 'Выключен' },
  'plan-mode-off-desc': { zh: '退出计划模式，恢复正常执行', en: 'Exit plan mode, back to normal execution', ru: 'Выйти из режима планирования, вернуться к обычному выполнению' },
  'hooks-not-mounted': { zh: 'DSH hooks（dsh-hooks-claude / dsh-hooks-codex）未在本 leaf 挂载。', en: 'DSH hooks (dsh-hooks-claude / dsh-hooks-codex) are not mounted in this leaf.', ru: 'DSH hooks (dsh-hooks-claude / dsh-hooks-codex) не подключены в этом leaf.' },
  'hooks-mount-hint': { zh: '需要时可在 cordis.yml 挂载对应 hooks 插件。', en: 'Mount the matching hooks plugin in cordis.yml when needed.', ru: 'При необходимости подключите соответствующий плагин hooks в cordis.yml.' },
  'update-unavailable': { zh: '当前运行方式不支持自动更新（需经 dsh --profile 启动），请在终端执行 dsh plugin --profile <name> update @deepseek-harness-tui/dsh-tui', en: 'Automatic update is unavailable in this launch mode (needs dsh --profile). Run dsh plugin --profile <name> update @deepseek-harness-tui/dsh-tui in a terminal.', ru: 'Автоматическое обновление недоступно в этом режиме запуска (нужен dsh --profile). Выполните в терминале dsh plugin --profile <name> update @deepseek-harness-tui/dsh-tui' },
  'update-working': { zh: '当前回合仍在运行，请等待完成后再更新 TUI。', en: 'The current turn is still running. Wait for it to finish before updating the TUI.', ru: 'Текущий ход всё ещё выполняется. Дождитесь завершения, прежде чем обновлять TUI.' },
  'update-starting': { zh: '正在更新 @deepseek-harness-tui/dsh-tui，完成后会自动重启并恢复当前会话……', en: 'Updating @deepseek-harness-tui/dsh-tui. The TUI will restart and resume this session when finished…', ru: 'Обновление @deepseek-harness-tui/dsh-tui. TUI перезапустится и восстановит эту сессию по завершении…' },
  'update-available': { zh: '发现新版本：v{{latest}}（当前 v{{current}}）· 输入 /update 更新 TUI', en: 'New version available: v{{latest}} (current v{{current}}) · type /update to update the TUI', ru: 'Доступна новая версия: v{{latest}} (текущая v{{current}}) · введите /update для обновления TUI' },
  'update-already-latest': { zh: '当前已是最新版本（v{{current}}）。', en: 'Already on the latest version (v{{current}}).', ru: 'Уже установлена последняя версия (v{{current}}).' },
  'update-check-failed': { zh: '无法确认新版本（网络或 registry 不可达），已尝试直接更新……', en: 'Could not confirm a newer version (network or registry unreachable); attempting the update anyway…', ru: 'Не удалось подтвердить наличие новой версии (сеть или registry недоступны); выполняется попытка обновления…' },
  'update-refused-deadlock': { zh: '已取消更新：镜像 registry 目前只能装到 v{{latest}}，而该版本在旧全局启动器的 patch 下会启动死锁（#183/#307）；官方最新为 v{{authoritative}}，待镜像同步后再 /update。', en: 'Update cancelled: the mirror registry can only serve v{{latest}}, which deadlocks boot under older global-launcher patches (#183/#307); official latest is v{{authoritative}} — retry /update after the mirror syncs.', ru: 'Обновление отменено: зеркальный registry может выдать только v{{latest}}, которая вызывает взаимоблокировку загрузки под старыми патчами глобального загрузчика (#183/#307); официальная последняя — v{{authoritative}} — повторите /update после синхронизации зеркала.' },
  'update-mirror-lag': { zh: '镜像 registry 滞后：本次安装 v{{latest}}；官方最新 v{{authoritative}}，镜像同步后可再 /update。', en: 'Mirror registry lag: installing v{{latest}} now; official latest is v{{authoritative}} — run /update again once the mirror syncs.', ru: 'Отставание зеркального registry: устанавливается v{{latest}}; официальная последняя — v{{authoritative}} — повторите /update после синхронизации зеркала.' },
  'update-standalone-available': { zh: '发现便携包新版本：v{{latest}}（当前 v{{current}}）· 输入 /update 自动更新', en: 'New standalone version available: v{{latest}} (current v{{current}}) · type /update to update', ru: 'Доступна новая портативная версия: v{{latest}} (текущая v{{current}}) · введите /update для обновления' },
  'update-standalone-no-checksum': { zh: '该版本未发布 SHA256 校验和，更新包完整性无法验证', en: 'this release publishes no SHA256 checksums; the update payload cannot be integrity-verified', ru: 'в этом выпуске не опубликованы контрольные суммы SHA256; целостность пакета обновления невозможно проверить' },
  'update-standalone-starting': { zh: '正在下载便携包新版本并自动替换，完成后会自动重启并恢复当前会话……', en: 'Downloading and replacing standalone binary. The TUI will restart and resume this session when finished…', ru: 'Загрузка и замена портативного исполняемого файла. TUI перезапустится и восстановит эту сессию по завершении…' },
  // ── /reload (pi-style soft reload) ────────────────────────────────────
  'reload-header': { zh: '已重读偏好文件：', en: 'Preferences reloaded:' , ru: 'Настройки перезагружены:'},
  'reload-applied': { zh: '{{kind}}  {{from}} → {{to}}（已应用）', en: '{{kind}}  {{from}} → {{to}} (applied)' , ru: '{{kind}}  {{from}} → {{to}} (применено)'},
  'reload-unchanged': { zh: '{{kind}}  无变化', en: '{{kind}}  unchanged' , ru: '{{kind}}  без изменений'},
  'reload-skipped-env': { zh: '{{kind}}  跳过：环境变量优先', en: '{{kind}}  skipped: env override wins' , ru: '{{kind}}  пропущено: переменная окружения имеет приоритет'},
  'reload-skipped-config': { zh: '{{kind}}  跳过：显式配置优先', en: '{{kind}}  skipped: explicit config wins' , ru: '{{kind}}  пропущено: явная конфигурация имеет приоритет'},
  'reload-skipped-invalid': { zh: '{{kind}}  跳过：文件缺失或无效', en: '{{kind}}  skipped: missing or invalid file' , ru: '{{kind}}  пропущено: файл отсутствует или некорректен'},
  'reload-footer': { zh: '提示：settings.yaml / cordis.patch.yml 由 watcher 自动热重载；cordis.yml 根配置改动需 /restart', en: 'Note: settings.yaml / cordis.patch.yml hot-reload via watchers; cordis.yml root config changes need /restart' , ru: 'Примечание: settings.yaml / cordis.patch.yml горячая перезагрузка через наблюдатели; изменения корневой конфигурации cordis.yml требуют /restart'},
  'reload-kind-theme': { zh: '主题', en: 'theme' , ru: 'тема'},
  'reload-kind-lang': { zh: '语言', en: 'language' , ru: 'язык'},
  'reload-kind-preset': { zh: '预设', en: 'preset' , ru: 'пресет'},
  'reload-kind-model': { zh: '模型', en: 'model' , ru: 'модель'},
  'reload-kind-activity': { zh: '活动指示', en: 'activity' , ru: 'активность'},
  // ── /restart (process restart with session resume) ────────────────────
  'restart-starting': { zh: '正在重启 dsh-tui，完成后自动恢复当前会话……', en: 'Restarting dsh-tui. The session resumes when it comes back…' , ru: 'Перезапуск dsh-tui. Сессия возобновится после возврата…'},
  'restart-unavailable': { zh: '当前运行方式不支持进程内重启（未挂载重启通道）。', en: 'Restart is unavailable in this launch mode (no restart channel mounted).' , ru: 'Перезапуск недоступен в этом режиме запуска (канал перезапуска не подключён).'},
  'streaming-folded': { zh: '…（前 {{count}} 字符流式期间已折叠，落定后完整显示）', en: '…(first {{count}} chars folded while streaming; full text renders once the turn settles)' , ru: '…(первые {{count}} символов свёрнуты во время потокового вывода; полный текст отображается после завершения ответа)'},
  'vim-on': { zh: 'vim 模式已开启（Esc 切 normal，i/a/o 回 insert）', en: 'vim mode on (Esc = normal, i/a/o = insert)' , ru: 'режим vim включён (Esc = normal, i/a/o = insert)'},
  'vim-off': { zh: 'vim 模式已关闭', en: 'vim mode off' , ru: 'режим vim выключен'},
  'terminal-setup-hint': { zh: '推荐 Windows Terminal（≥110 列、等宽字体、TrueColor）。', en: 'Recommended: Windows Terminal (≥110 columns, monospace, TrueColor).' , ru: 'Рекомендуется: Windows Terminal (≥110 столбцов, моноширинный, TrueColor).'},
  'terminal-paste-hint': { zh: '{{mod}}V 或 Alt+V 粘贴文本、文件路径或图片；Ctrl+Shift+V 终端原生粘贴；右键粘贴同样可用；快捷键可在 /settings 修改。', en: '{{mod}}V or Alt+V pastes text, file paths, or images; Ctrl+Shift+V is native terminal paste; right-click paste also works; remappable via /settings.' , ru: '{{mod}}V или Alt+V вставляет текст, пути к файлам или изображения; Ctrl+Shift+V — нативная вставка терминала; правая кнопка мыши тоже работает; переназначается через /settings.'},
  'connect-none': { zh: '当前环境未提供远程连接服务。', en: 'No remote connection service is available in this environment.' , ru: 'В этом окружении удалённое соединение недоступно.'},
  'theme-switch-failed': { zh: '主题「{{name}}」切换失败（无法写入 ~/.dsh-tui/theme.json）', en: 'Theme "{{name}}" switch failed (cannot write ~/.dsh-tui/theme.json)' , ru: 'Не удалось переключить тему «{{name}}» (невозможно записать ~/.dsh-tui/theme.json)'},
  'interrupt-delivered': { zh: '已打断当前回合，{{n}} 条消息立即处理', en: 'Interrupted current turn, {{n}} messages processed immediately' , ru: 'Прерван текущий ответ, {{n}} сообщений обработаны немедленно'},
  'btw-usage': { zh: '用法：/btw <问题> —— 不打断当前对话的快速侧问', en: 'Usage: /btw <question> — quick side question without interrupting the conversation', ru: 'Использование: /btw <вопрос> — быстрый уточняющий вопрос без прерывания диалога' },
  'btw-answering': { zh: '思考中…', en: 'Answering…' , ru: 'Отвечаю…'},
  'btw-hint-loading': { zh: 'Esc 取消', en: 'Esc cancel' , ru: 'Esc отмена'},
  'btw-hint-done': { zh: '↑/↓ 滚动 · Space/Enter/Esc 关闭 · c 复制', en: '↑/↓ scroll · Space/Enter/Esc dismiss · c copy', ru: '↑/↓ прокрутка · Space/Enter/Esc закрыть · c копировать' },
  'btw-llm-unavailable': { zh: '侧问不可用（llm 服务未挂载）', en: 'Side question unavailable (llm service not mounted)' , ru: 'Боковой вопрос недоступен (служба llm не подключена)'},
  'recap-llm-unavailable': { zh: 'recap 不可用（llm 服务未挂载）', en: 'Recap unavailable (llm service not mounted)' , ru: 'Краткий обзор недоступен (служба llm не подключена)'},
  'recap-no-activity': { zh: '会话还没有可总结的活动', en: 'No session activity to recap yet' , ru: 'Пока нет активности сессии для обзора'},
  'recap-answering': { zh: '正在总结最近活动…', en: 'Summarizing recent activity…' , ru: 'Подводим итоги недавней активности…'},
  'recap-title-label': { zh: '建议标题', en: 'Suggested title' , ru: 'Предлагаемый заголовок'},
  'recap-apply-title': { zh: '应用', en: 'Apply' , ru: 'Применить'},
  'recap-title-applied': { zh: '已应用', en: 'Applied' , ru: 'Применено'},
  'recap-title-applied-notify': { zh: '已将会话标题设为「{{title}}」', en: 'Session title set to "{{title}}"' , ru: 'Заголовок сессии установлен: «{{title}}»'},
  'recap-hint': { zh: '↑/↓ 滚动 · Space/Enter/Esc 关闭 · c 复制{{apply}}', en: '↑/↓ scroll · Space/Enter/Esc dismiss · c copy{{apply}}' , ru: '↑/↓ прокрутка · Space/Enter/Esc закрыть · c копировать{{apply}}'},
  'recap-auto-hint': { zh: '点击展开查看/应用', en: 'Click to expand & apply' , ru: 'Нажмите, чтобы развернуть и применить'},
  'recap-auto-close': { zh: '关闭', en: 'Dismiss' , ru: 'Закрыть'},
  'recap-auto-line': { zh: '回顾：{{summary}}', en: 'Recap: {{summary}}' , ru: 'Обзор: {{summary}}'},
  'recap-panel-title': { zh: '会话回顾', en: 'Session recap' , ru: 'Обзор сессии'},
  'recap-panel-subtitle': { zh: '最近活动的快速复盘', en: 'A quick recap of recent activity' , ru: 'Краткий обзор недавней активности'},
  'color-current': { zh: '当前会话颜色  {{name}}', en: 'Current session color  {{name}}' , ru: 'Цвет текущей сессии  {{name}}'},
  'color-current-none': { zh: '当前会话未设置颜色（用主题默认）', en: 'No session color set (theme default)' , ru: 'Цвет сессии не задан (тема по умолчанию)'},
  'color-usage': { zh: '用法：/color <{{list}}|reset> —— 颜色按会话保存，resume 后仍在', en: 'Usage: /color <{{list}}|reset> — per-session, survives resume' , ru: 'Использование: /color <{{list}}|reset> — для каждой сессии, сохраняется после возобновления'},
  'color-reset': { zh: '已清除会话颜色，恢复主题默认', en: 'Session color cleared — back to the theme default' , ru: 'Цвет сессии сброшен — возврат к теме по умолчанию'},
  'color-unknown': { zh: '未知颜色「{{name}}」· 可选：{{list}}', en: 'Unknown color "{{name}}" · available: {{list}}' , ru: 'Неизвестный цвет «{{name}}» · доступно: {{list}}'},
  'color-set': { zh: '会话颜色已设为 {{name}}', en: 'Session color set to {{name}}' , ru: 'Цвет сессии установлен: {{name}}'},
  'exit-press-again': { zh: '再次按 Ctrl+C 退出', en: 'Press Ctrl+C again to exit' , ru: 'Нажмите Ctrl+C ещё раз для выхода'},
  'esc-again-rewind': { zh: '再次按 Esc 时间回溯', en: 'Press Esc again to rewind' , ru: 'Нажмите Esc ещё раз для отмотки назад'},
  'esc-again-clear': { zh: '再次按 Esc 清空', en: 'Press Esc again to clear' , ru: 'Нажмите Esc ещё раз для очистки'},
  'new-session-started': { zh: '已新建会话', en: 'New session started' , ru: 'Новая сессия начата'},
  'command-not-found': { zh: '/{{name}}：没有这个命令', en: '/{{name}}: no such command' , ru: '/{{name}}: нет такой команды'},
  'command-images-unsupported': {
    zh: '/{{name}} 不接受图片；草稿已保留',
    en: '/{{name}} does not accept images; the draft was preserved',
  ru: '/{{name}} не принимает изображения; черновик сохранён'},
  'command-images-runtime-unsupported': {
    zh: '/{{name}}：当前命令运行时不支持图片；草稿已保留',
    en: '/{{name}}: this command runtime cannot accept images; the draft was preserved',
  ru: '/{{name}}: текущая среда выполнения команды не принимает изображения; черновик сохранён'},
  'command-images-limit': {
    zh: '/{{name}}：图片数量或总大小超过当前 profile 限制；草稿已保留',
    en: '/{{name}}: the image batch exceeds this profile\'s limits; the draft was preserved',
  ru: '/{{name}}: пакет изображений превышает ограничения этого профиля; черновик сохранён'},
  'command-images-missing': {
    zh: '/{{name}}：图片已失效或不可读取（{{paths}}）；草稿已保留',
    en: '/{{name}}: images are stale or unreadable ({{paths}}); the draft was preserved',
  ru: '/{{name}}: изображения устарели или нечитаемы ({{paths}}); черновик сохранён'},
  'command-running': {
    zh: '命令仍在执行，请等待本次结果',
    en: 'The command is still running; wait for this attempt to settle',
  ru: 'Команда всё ещё выполняется; дождитесь завершения этой попытки'},
  'command-changed': {
    zh: '/{{name}} 在图片准备期间发生变化；未执行，草稿已保留',
    en: '/{{name}} changed while its images were prepared; it was not run and the draft was preserved',
  ru: '/{{name}} изменился во время подготовки изображений; не запущен, черновик сохранён'},
  'shell-images-unsupported': {
    zh: 'Shell 命令不接受图片；草稿已保留',
    en: 'Shell commands do not accept images; the draft was preserved',
  ru: 'Команды оболочки не принимают изображения; черновик сохранён'},
  'thinking-toggled': { zh: '思考过程：{{state}}', en: 'Thinking display: {{state}}' , ru: 'Отображение рассуждений: {{state}}'},
  'thinking-on': { zh: '显示', en: 'shown' , ru: 'показано'},
  'thinking-off': { zh: '隐藏', en: 'hidden' , ru: 'скрыто'},
  'tokens-usage': { zh: 'Tokens：{{in}} 输入 · {{out}} 输出', en: 'Tokens: {{in}} in · {{out}} out' , ru: 'Токены: {{in}} вход · {{out}} выход'},
  'tokens-usage-context': { zh: '{{usage}} · 上下文 {{percent}}%', en: '{{usage}} · {{percent}}% of context' , ru: '{{usage}} · {{percent}}% контекста'},

  // ── plugin.ts — /update flow ───────────────────────────────────────
  'update-aborted-no-profile': { zh: 'dsh-tui 更新中止：未解析到 dsh profile。', en: 'dsh-tui update aborted: no dsh profile resolved.' , ru: 'Обновление dsh-tui прервано: профиль dsh не определён.'},
  // 0.8.3 launcher alignment bridge: /update only replaces the profile
  // copy; the global `dsh-tui` launcher must be aligned separately.
  'update-launcher-align-unknown': {
    zh: 'Profile 已更新到 v{{version}}。如果你平时使用全局 dsh-tui 命令启动，请同步更新全局启动器：\n  npm install -g --legacy-peer-deps @deepseek-harness-tui/dsh-tui@{{version}}\n（--legacy-peer-deps 可绕过 npm 12 的 peer 解析崩溃，全局启动器是瘦壳，跳过全局 peer 解析是安全的）',
    en: 'The profile is now v{{version}}. If you normally launch with the global dsh-tui command, align the global launcher too:\n  npm install -g --legacy-peer-deps @deepseek-harness-tui/dsh-tui@{{version}}\n(--legacy-peer-deps works around an npm 12 peer-resolution crash; the global launcher is a thin shim, so skipping global peer resolution is safe.)',
  ru: 'Профиль теперь v{{version}}. Если вы обычно запускаете через глобальную команду dsh-tui, синхронизируйте и глобальный лаунчер:\n  npm install -g --legacy-peer-deps @deepseek-harness-tui/dsh-tui@{{version}}\n(--legacy-peer-deps обходит сбой разрешения peer-зависимостей npm 12; глобальный лаунчер — тонкая прослойка, поэтому пропуск глобального разрешения peer-зависимостей безопасен.)'},
  'update-launcher-outdated': {
    zh: 'Profile 已更新到 v{{profile}}，但全局启动器仍是 v{{launcher}}。请同步更新：\n  npm install -g --legacy-peer-deps @deepseek-harness-tui/dsh-tui@{{profile}}\n（--legacy-peer-deps 可绕过 npm 12 的 peer 解析崩溃，见 #459）',
    en: 'The profile is now v{{profile}}, but the global launcher is still v{{launcher}}. Align it with:\n  npm install -g --legacy-peer-deps @deepseek-harness-tui/dsh-tui@{{profile}}\n(--legacy-peer-deps works around an npm 12 peer-resolution crash, see #459.)',
  ru: 'Профиль теперь v{{profile}}, но глобальный лаунчер всё ещё v{{launcher}}. Синхронизируйте его:\n  npm install -g --legacy-peer-deps @deepseek-harness-tui/dsh-tui@{{profile}}\n(--legacy-peer-deps обходит сбой разрешения peer-зависимостей npm 12, см. #459.)'},

  // ── components/ActivityLine.tsx ──────────────────────────────────────
  'activity-ctx-warn': { zh: '⚠ 上下文', en: '⚠ ctx ' , ru: '⚠ контекст '},

  // ── components/ActivityPicker.tsx ─────────────────────────────────────
  'activity-random-each-preset': { zh: '每次随机一个预设', en: 'random preset each time' , ru: 'случайный пресет каждый раз'},

  // ── components/PresetPicker.tsx ──────────────────────────────────────
  'preset-default-tag': { zh: '（默认）', en: ' (default)' , ru: ' (по умолчанию)'},
  'preset-broken-tag': { zh: '（无法加载）', en: ' (failed to load)' , ru: ' (не удалось загрузить)'},

  // ── channel.ts — reasoning-effort notifications ──────────────────────
  'effort-unavailable': { zh: '推理等级切换不可用（llm 服务未挂载）', en: 'Reasoning effort switching unavailable (llm service not mounted)' , ru: 'Переключение уровня рассуждений недоступно (служба llm не подключена)'},
  'effort-read-failed': { zh: '推理等级读取失败 · {{error}}', en: 'Failed to read reasoning efforts · {{error}}' , ru: 'Не удалось прочитать уровни рассуждений · {{error}}'},
  'effort-single-tier': { zh: '当前模型只有一档推理等级（{{name}}）', en: 'Current model has a single reasoning effort ({{name}})' , ru: 'У текущей модели только один уровень рассуждений ({{name}})'},
  'effort-unsupported': { zh: '当前模型不支持推理等级切换', en: 'Current model does not support reasoning effort switching' , ru: 'Текущая модель не поддерживает переключение уровня рассуждений'},
  'effort-switched': { zh: '推理强度 → {{name}}', en: 'Reasoning effort → {{name}}' , ru: 'Уровень рассуждений → {{name}}'},
  'effort-invalid': { zh: '未知推理等级 {{id}}（当前模型可选：{{ids}}）', en: 'Unknown reasoning effort {{id}} (this model offers: {{ids}})' , ru: 'Неизвестный уровень рассуждений {{id}} (у этой модели: {{ids}})'},
  'effort-current': { zh: '当前推理强度 {{name}}', en: 'Current reasoning effort {{name}}' , ru: 'Текущий уровень рассуждений {{name}}'},
  'effort-usage': { zh: '用法：/effort（滑杆）| /effort <id> | /effort status', en: 'Usage: /effort (slider) | /effort <id> | /effort status' , ru: 'Использование: /effort (слайдер) | /effort <id> | /effort status'},

  // ── channel.ts — Shift+Tab session modes ────────────────────────────
  'mode-switched': { zh: '模式 → {{name}}', en: 'Mode → {{name}}' , ru: 'Режим → {{name}}'},
  'mode-default': { zh: '默认', en: 'default' , ru: 'по умолчанию'},
  'mode-plan': { zh: '计划模式', en: 'plan mode' , ru: 'режим планирования'},
  'mode-full': { zh: '完全访问', en: 'full access' , ru: 'полный доступ'},
  'mode-plan-unavailable': { zh: '当前 preset 未注册 /plan 命令，无法切换计划模式', en: 'The active preset does not register /plan; cannot toggle plan mode' , ru: 'Активный пресет не регистрирует /plan; нельзя переключить режим планирования'},
  'mode-permission-unregistered': { zh: '当前 preset 未注册 /permission 命令，无法切换权限模式', en: 'The active preset does not register /permission; cannot switch the permission mode' , ru: 'Активный пресет не регистрирует /permission; нельзя переключить режим прав доступа'},
  'mode-permission-invoke-failed': { zh: '/permission 切换失败，请重试或查看日志', en: '/permission switch failed; retry or check the logs' , ru: 'Переключение /permission не удалось; повторите или проверьте журналы'},
  'mode-permission-unconfirmed': { zh: '权限切换未被 DSH 确认，模式未改变', en: 'The permission switch was not confirmed by DSH; the mode is unchanged' , ru: 'Переключение прав доступа не подтверждено DSH; режим не изменился'},
  'mode-permission-no-canonical': { zh: '模式「{{name}}」的 sandbox/approval 组合没有对应权限预设，无法安全切换', en: 'Mode "{{name}}" has no matching permission preset for its sandbox/approval combo; cannot switch safely' , ru: 'Режим «{{name}}» не имеет подходящего пресета прав доступа для своей комбинации sandbox/approval; безопасное переключение невозможно'},
  'cmd-desc-permission': { zh: '切换权限预设（沙箱模式 + 审批策略）', en: 'Switch the permission preset (sandbox mode + approval policy)' , ru: 'Переключить пресет прав доступа (режим песочницы + политика подтверждения)'},

  // ── components/LogoV2.tsx ───────────────────────────────────────────
  'logo-tagline': { zh: '探索未至之境！', en: 'Explore the uncharted!' , ru: 'Исследуйте неизведанное!'},
  'logo-tip-prefix': { zh: '提示：', en: 'Tip: ' , ru: 'Совет: '},
  'logo-tip-more': { zh: '更多技巧', en: 'more tips' , ru: 'больше советов'},
  'logo-effort-label': { zh: ' · {{tier}} effort', en: ' · {{tier}} effort', ru: ' · усилие: {{tier}}' },
  // Upstream-drift notice (merged one-liner under the tip; copy explains
  // the problem AND the fix — the command pins the validated line).
  'logo-drift-newer': {
    zh: 'dsh 引擎为 {{installed}}，比本界面验证过的 {{validated}} 新，可能出现兼容问题；求稳可执行 npm i -g @deepseek-ai/dsh@{{primary}} 降级，或等待 dsh-tui 适配新版。',
    en: 'The dsh engine ({{installed}}) is newer than the {{validated}} this UI is validated against, so issues are possible; downgrade via npm i -g @deepseek-ai/dsh@{{primary}} for stability, or wait for a dsh-tui update.',
  ru: 'Движок dsh ({{installed}}) новее, чем {{validated}}, под которую адаптирован этот интерфейс, поэтому возможны проблемы; для стабильности выполните понижение через npm i -g @deepseek-ai/dsh@{{primary}} или дождитесь обновления dsh-tui.'},
  'logo-drift-older': {
    zh: 'dsh 引擎为 {{installed}}，低于本界面验证过的 {{validated}}，部分功能可能不可用；建议执行 npm i -g @deepseek-ai/dsh@{{primary}} 升级。',
    en: 'The dsh engine ({{installed}}) is older than the {{validated}} this UI is validated against; some features may be missing. Upgrade via npm i -g @deepseek-ai/dsh@{{primary}}.',
  ru: 'Движок dsh ({{installed}}) старее, чем {{validated}}, под которую адаптирован этот интерфейс; некоторые функции могут отсутствовать. Обновите через npm i -g @deepseek-ai/dsh@{{primary}}.'},
  'logo-drift-mixed': {
    zh: '检测到 dsh 引擎多版本混装（{{installed}}），容易出现奇怪问题；建议执行 npm i -g @deepseek-ai/dsh@{{primary}} 统一版本。',
    en: 'Mixed dsh engine versions detected ({{installed}}), which can cause odd behavior; unify them via npm i -g @deepseek-ai/dsh@{{primary}}.',
  ru: 'Обнаружены смешанные версии движка dsh ({{installed}}), что может вызвать странное поведение; унифицируйте их через npm i -g @deepseek-ai/dsh@{{primary}}.'},
  'logo-drift-broken': {
    zh: 'dsh 引擎版本异常（{{installed}}），本界面验证过 {{validated}}；建议执行 npm i -g @deepseek-ai/dsh@{{primary}} 重装。',
    en: 'Unexpected dsh engine versions ({{installed}}); this UI is validated against {{validated}}. Reinstall via npm i -g @deepseek-ai/dsh@{{primary}}.',
  ru: 'Неожиданная версия движка dsh ({{installed}}); этот интерфейс проверен с {{validated}}. Переустановите через npm i -g @deepseek-ai/dsh@{{primary}}.'},

  // ── components/PromptInput.tsx ──────────────────────────────────────
  'input-sent-after-turn': { zh: '已发送，当前回合结束后处理', en: 'Sent, processed after the current turn' , ru: 'Отправлено, обрабатывается после текущего раунда'},
  'input-injected': { zh: '已从编辑器发送', en: 'Sent from editor' , ru: 'Отправлено из редактора'},
  'input-interrupted-next': { zh: '已插话 · 下一步立即处理', en: 'Interrupted · processed next' , ru: 'Прервано · обрабатывается следующим'},
  'input-queued-after-turn': { zh: '已排队 · 回合结束后处理', en: 'Queued · processed after the turn' , ru: 'В очереди · обрабатывается после раунда'},
  'input-cannot-retract': { zh: '无法撤回：消息可能已被处理，或当前版本不支持', en: 'Cannot retract: the message may already be processed, or this version doesn\'t support it' , ru: 'Невозможно отозвать: сообщение уже может быть обработано или эта версия не поддерживает это'},
  'input-retracted': { zh: '已撤回，可编辑后重新发送', en: 'Retracted, editable and resendable' , ru: 'Отозвано, можно редактировать и отправить снова'},
  'input-empty': { zh: '输入为空，没有可发送的内容', en: 'Empty input, nothing to send' , ru: 'Пустой ввод, нечего отправлять'},
  'input-interrupt-immediate': { zh: '已打断当前回合，正在立即处理', en: 'Interrupted current turn, processing immediately' , ru: 'Текущий раунд прерван, обрабатывается немедленно'},
  'input-clipboard-empty': { zh: '剪贴板为空', en: 'Clipboard is empty' , ru: 'Буфер обмена пуст'},
  'input-editor-unavailable': { zh: '错误：未配置编辑器。请设置 $VISUAL 或 $EDITOR 环境变量。', en: 'Error: No editor configured. Set $VISUAL or $EDITOR environment variable.' , ru: 'Ошибка: редактор не настроен. Задайте переменную окружения $VISUAL или $EDITOR.'},
  'input-editor-failed': { zh: '外部编辑器失败：{{name}}', en: 'External editor failed: {{name}}' , ru: 'Внешний редактор не удался: {{name}}'},
  'input-clipboard-read-failed': { zh: '读取剪贴板失败', en: 'Failed to read the clipboard' , ru: 'Не удалось прочитать буфер обмена'},
  'input-clipboard-unavailable': { zh: '无法读取剪贴板：没有可用的 wl-paste / xclip / xsel（未安装或会话不可连接）', en: 'Cannot read clipboard: no usable wl-paste / xclip / xsel (not installed or session unreachable)' , ru: 'Невозможно прочитать буфер обмена: нет подходящего wl-paste / xclip / xsel (не установлены или сессия недоступна)'},
  'input-image-pasted': { zh: '已粘贴图片 {{token}}', en: 'Pasted image {{token}}' , ru: 'Вставлено изображение {{token}}'},
  'input-image-paste-failed': { zh: '粘贴图片失败：{{err}}', en: 'Could not paste image: {{err}}' , ru: 'Не удалось вставить изображение: {{err}}'},
  'input-image-paste-limit': { zh: '图片数量超过当前配置的单条消息上限', en: 'Image count exceeds the per-message limit for this profile' , ru: 'Количество изображений превышает лимит на сообщение для этого профиля'},
  'input-image-format-unsupported': { zh: '剪贴板图片格式不受支持；请使用 PNG、JPEG、WebP 或 GIF', en: 'Clipboard image format is unsupported; use PNG, JPEG, WebP, or GIF' , ru: 'Формат изображения в буфере обмена не поддерживается; используйте PNG, JPEG, WebP или GIF'},
  'input-pending-steer-label': { zh: '插话 · 下一步送达', en: 'Steer · delivered next' , ru: 'Направить · доставлено следующим'},
  'input-pending-queue-label': { zh: '排队 · 回合结束后送达', en: 'Queued · delivered after the turn' , ru: 'В очереди · доставлено после раунда'},
  'input-pending-actions-hint': { zh: '撤回 · Esc 打断并立即发送', en: 'Retract · Esc interrupts and sends immediately' , ru: 'Отозвать · Esc прерывает и отправляет немедленно'},
  'input-fold-stats': { zh: '{{lines}} 行 · {{chars}} 字', en: '{{lines}} lines · {{chars}} chars' , ru: '{{lines}} строк · {{chars}} символов'},
  'input-fold-hover': { zh: '悬停查看', en: 'hover to peek' , ru: 'наведите для просмотра'},
  'input-fold-peek-footer': { zh: '… 共 {{lines}} 行 · 点击展开编辑', en: '… {{lines}} lines total · click to edit' , ru: '… всего {{lines}} строк · нажмите для редактирования'},

  // ── 全屏草稿编辑（PromptInput 展开态 + PromptEditor Layer）─────────
  'input-expand-editor-title': { zh: '草稿编辑', en: 'Draft editor' , ru: 'Редактор черновика'},
  'input-expand-editor-position': { zh: '行 {{line}} · 列 {{col}}', en: 'Ln {{line}}, Col {{col}}' , ru: 'Строка {{line}}, Столбец {{col}}'},
  'input-expand-editor-scroll': { zh: '滚轮翻动 · 光标行自动跟随', en: 'wheel scrolls · caret row follows' , ru: 'колесо прокручивает · строка курсора следует за ним'},
  'input-expand-editor-send': { zh: '发送', en: 'Send' , ru: 'Отправить'},
  'input-expand-editor-collapse': { zh: '收起', en: 'Collapse' , ru: 'Свернуть'},
  'input-expand-editor-hint-send': { zh: 'Ctrl+Enter 发送', en: 'Ctrl+Enter sends' , ru: 'Ctrl+Enter отправляет'},
  'input-expand-editor-hint-collapse': { zh: 'Esc 收起', en: 'Esc collapses' , ru: 'Esc сворачивает'},

  // ── messages/AssistantToolUseMessage.tsx（工具卡头部悬停元数据浮层）─────
  // 头部已完整显示标题/参数时，悬停不再重复可见文本，改弹卡片元数据：
  // 开始/结束/失败时刻、退出码与信号（这些头部都没有）。时长不入内——
  // settled 卡的头部 chip（`· 5m30s`）与运行中卡的 body 已显示时长。
  'tool-tip-started': { zh: '开始 {{time}}', en: 'started {{time}}' , ru: 'начато {{time}}'},
  'tool-tip-finished': { zh: '结束 {{time}}', en: 'finished {{time}}' , ru: 'завершено {{time}}'},
  'tool-tip-failed': { zh: '失败 {{time}}', en: 'failed {{time}}' , ru: 'не удалось {{time}}'},
  'tool-tip-exit': { zh: '退出码 {{code}}', en: 'exit {{code}}' , ru: 'выход {{code}}'},
  'tool-tip-signal': { zh: '信号 {{name}}', en: 'signal {{name}}' , ru: 'сигнал {{name}}'},

  // ── components/SuggestionCard.tsx（/ 命令菜单 · @ 文件菜单）─────────
  'sugg-commands-title': { zh: '命令', en: 'commands' , ru: 'команды'},
  'sugg-files-title': { zh: '文件', en: 'files' , ru: 'файлы'},
  'sugg-count': { zh: '共 {{n}} 项', en: '{{n}} items' , ru: '{{n}} элементов'},
  'sugg-more-above': { zh: '↑{{n}}', en: '↑{{n}}' , ru: '↑{{n}}'},
  'sugg-more-below': { zh: '↓{{n}}', en: '↓{{n}}' , ru: '↓{{n}}'},
  // 二级补全子项描述（/lang /theme /effort /preset /activity 的 children）
  'sugg-status-desc': { zh: '显示当前选择', en: 'Show the current choice' , ru: 'Показать текущий выбор'},
  'sugg-lang-zh-desc': { zh: '切换界面语言到中文', en: 'Switch the UI language to Chinese' , ru: 'Переключить язык интерфейса на китайский'},
  'sugg-lang-en-desc': { zh: '切换界面语言到英文', en: 'Switch the UI language to English' , ru: 'Переключить язык интерфейса на английский'},
  'sugg-lang-ru-desc': { zh: '切换界面语言到俄文', en: 'Switch the UI language to Russian', ru: 'Переключить язык интерфейса на русский' },
  'sugg-theme-auto-desc': { zh: '跟随终端背景自动切换', en: 'Follow the terminal background' , ru: 'Следовать фону терминала'},
  'sugg-theme-builtin-desc': { zh: '内置主题', en: 'Built-in theme' , ru: 'Встроенная тема'},
  'sugg-theme-user-desc': { zh: '用户主题（{{base}} 基底）', en: 'User theme ({{base}} base)' , ru: 'Пользовательская тема (база {{base}})'},
  'sugg-theme-plugin-desc': { zh: '插件主题（{{base}} 基底）', en: 'Plugin theme ({{base}} base)' , ru: 'Тема плагина (база {{base}})'},
  'sugg-effort-level-desc': { zh: '思考强度档位', en: 'Reasoning effort level' , ru: 'Уровень глубины рассуждения'},
  'sugg-activity-frames-desc': { zh: '列出或切换动画帧预设', en: 'List or switch frame presets' , ru: 'Список или переключение пресетов кадров'},
  'sugg-activity-frame-desc': { zh: '动画帧预设', en: 'Animation frame preset' , ru: 'Пресет кадра анимации'},
  'sugg-color-reset-desc': { zh: '清除会话颜色，恢复主题默认', en: 'Clear the session color' , ru: 'Сбросить цвет сессии'},
  'sugg-color-name-desc': { zh: '会话强调色', en: 'Session accent color' , ru: 'Акцентный цвет сессии'},

  // ── dsh-adapter/plugin.ts（/settings 渲染设置）───────────────────────
  'settings-fullscreen-restart': { zh: '全屏设置已保存，重启 dsh-tui 后生效', en: 'Fullscreen preference saved — restart dsh-tui to apply' , ru: 'Настройка полноэкранного режима сохранена — перезапустите dsh-tui для применения'},
  'settings-terminal-images-restart': { zh: '图片预览设置已保存，使用 /restart 重启 TUI 后生效', en: 'Image preview preference saved — use /restart to apply' , ru: 'Настройка предпросмотра изображений сохранена — используйте /restart для применения'},
  'settings-fullscreen-migrated': { zh: '全屏已是出厂默认（已清除更新前的 inline 选择）；偏好 inline 可在 /settings 改回', en: 'Fullscreen is now the factory default (pre-update inline choice cleared); prefer inline? Switch back in /settings' , ru: 'Полноэкранный режим теперь заводской по умолчанию (выбор inline до обновления очищен); предпочитаете inline? Верните в /settings'},

  // ── components/HelpMenu.tsx ─────────────────────────────────────────
  'help-for-commands': { zh: '/ 查看命令', en: '/ for commands' , ru: '/ — команды'},
  'help-this-help': { zh: '? 查看本帮助', en: '? for this help' , ru: '? — эта справка'},
  'help-verbose-output': { zh: '{{mod}}o 详细输出', en: '{{mod}}o for verbose output' , ru: '{{mod}}o — подробный вывод'},
  'help-open-trajectory': { zh: '{{mod}}t 打开会话轨迹', en: '{{mod}}t to open trajectory' , ru: '{{mod}}t — открыть траекторию'},
  'help-search-history': { zh: '{{mod}}r 搜索历史', en: '{{mod}}r to search history' , ru: '{{mod}}r — поиск по истории'},
  'help-interrupt': { zh: 'ctrl+c 打断', en: 'ctrl+c to interrupt' , ru: 'ctrl+c — прервать'},
  'help-exit': { zh: 'ctrl+d 退出', en: 'ctrl+d to exit' , ru: 'ctrl+d — выйти'},
  'help-redraw': { zh: '{{mod}}l 重绘', en: '{{mod}}l to redraw' , ru: '{{mod}}l — перерисовать'},
  'help-clear-input': { zh: 'esc 清空输入', en: 'esc to clear input' , ru: 'esc — очистить ввод'},
  'help-history-nav': { zh: '↑/↓ 历史', en: '↑/↓ for history' , ru: '↑/↓ — история'},
  'help-move-cursor': { zh: '←/→ 移动光标', en: '←/→ to move cursor' , ru: '←/→ — перемещение курсора'},
  'help-word-jumps': { zh: '{{mod}}←/→ 按词跳转', en: '{{mod}}←/→ for word jumps' , ru: '{{mod}}←/→ — переход по словам'},
  'help-complete-command': { zh: 'tab 补全命令', en: 'tab to complete command' , ru: 'tab — дополнить команду'},
  'help-cycle-mode': { zh: 'shift+tab 切换模式', en: 'shift+tab to cycle mode' , ru: 'shift+tab — переключать режим'},
  'help-open-editor': { zh: 'ctrl+g 打开编辑器', en: 'ctrl+g to open editor' , ru: 'ctrl+g — открыть редактор'},
  'help-fold-todos': { zh: '{{mod}}q 折叠待办', en: '{{mod}}q to fold todos' , ru: '{{mod}}q — свернуть задачи'},
  'goal-todo-fold-hint': { zh: '{{mod}}q 折叠', en: '{{mod}}q to fold' , ru: '{{mod}}q — свернуть'},
  'help-commands-title': { zh: '命令：', en: 'commands:' , ru: 'команды:'},
  'help-scroll-hint': {
    zh: '↑/↓ 滚动 · PgUp/PgDn 翻页 · Home/End 首尾 · Esc 关闭',
    en: '↑/↓ scroll · PgUp/PgDn page · Home/End jump · Esc close',
  ru: '↑/↓ прокрутка · PgUp/PgDn страница · Home/End переход · Esc закрыть'},
  'tips-title': { zh: '使用技巧（快捷键 · 命令 · 工作流 · 个性化 · 避坑）', en: 'Usage tips (shortcuts · commands · workflow · display · gotchas)' , ru: 'Советы по использованию (горячие клавиши · команды · рабочий процесс · отображение · подводные камни)'},
  'tips-hint': { zh: '↑/↓ 滚动 · Esc 关闭', en: '↑/↓ scroll · Esc to close' , ru: '↑/↓ прокрутка · Esc — закрыть'},

  // ── components/TurnInterruptedRow.tsx ────────────────────────────────
  'interrupted-by-user': { zh: '已打断 ', en: 'Interrupted ' , ru: 'Прервано '},
  'interrupted-ask-next': { zh: '· 接下来想让 DeepSeek 做什么？', en: '· What should DeepSeek do instead?' , ru: '· Что должен сделать DeepSeek вместо этого?'},

  // ── components/MessageList.tsx ──────────────────────────────────────
  'load-earlier': { zh: ' ↑ 加载更早消息（会话日志完整，/export 导出全文） ', en: ' ↑ load earlier messages (full session log; /export for full text) ' , ru: ' ↑ загрузить более ранние сообщения (полный журнал сессии; /export для полного текста) '},
  'show-previous-messages': { zh: ' ctrl+e 显示前 {{n}} 条消息 ', en: ' ctrl+e to show {{n}} previous messages ' , ru: ' ctrl+e — показать {{n}} предыдущих сообщений '},
  'resume-none-in-cwd': { zh: '当前目录没有可恢复的历史会话', en: 'No resumable sessions in the current directory' , ru: 'В текущей директории нет возобновляемых сессий'},

  // ── screens/SessionBrowser.tsx + screens/Chat.tsx (/resume) ─────────
  'resume-resumed': { zh: '已恢复会话', en: 'Session resumed' , ru: 'Сессия возобновлена'},
  'resume-delete-confirm': { zh: '删除「{{name}}」？会话日志将被永久移除。', en: 'Delete "{{name}}"? The session log is removed permanently.' , ru: 'Удалить «{{name}}»? Журнал сессии будет удалён навсегда.'},
  'resume-deleted': { zh: '已删除会话「{{name}}」', en: 'Deleted session {{name}}' , ru: 'Удалена сессия {{name}}'},
  'resume-delete-failed': { zh: '无法删除会话「{{name}}」', en: 'Could not delete session {{name}}' , ru: 'Не удалось удалить сессию {{name}}'},
  'resume-rename-placeholder': { zh: '新的会话名称…', en: 'New session name…' , ru: 'Новое имя сессии…'},
  'resume-rename-failed': { zh: '无法重命名会话「{{name}}」', en: 'Could not rename session {{name}}' , ru: 'Не удалось переименовать сессию {{name}}'},
  'resume-hint-delete': { zh: '**Enter** 删除 · Esc 取消', en: '**Enter** to delete · Esc to cancel' , ru: '**Enter** — удалить · Esc — отмена'},
  'resume-hint-rename': { zh: '**Enter** 保存 · Esc 取消', en: '**Enter** to save · Esc to cancel' , ru: '**Enter** — сохранить · Esc — отмена'},
  'resume-title': { zh: '恢复会话', en: 'Resume session' , ru: 'Возобновить сессию'},

  // ── screens/AgentView.tsx + channel.ts (session overview) ─
  'agentview-title': { zh: '会话总览', en: 'Session overview' , ru: 'Обзор сессии'},
  'agentview-count-awaited': { zh: '{{n}} 个等待输入', en: '{{n}} awaiting input' , ru: '{{n}} ожидают ввода'},
  'agentview-count-working': { zh: '{{n}} 个运行中', en: '{{n}} working' , ru: '{{n}} выполняются'},
  'agentview-count-completed': { zh: '{{n}} 个已完成', en: '{{n}} completed' , ru: '{{n}} завершено'},
  'agentview-count-failed': { zh: '{{n}} 个失败', en: '{{n}} failed' , ru: '{{n}} не удалось'},
  'agentview-bg-notice': { zh: '当前会话已转入后台 —— **Enter** 打开它 · **Esc** 返回它 · **Ctrl+C** 两次退出', en: 'Your conversation moved to the background — **Enter** opens it · **Esc** returns to it · **Ctrl+C** twice quits' , ru: 'Ваш разговор перемещён в фон — **Enter** открывает его · **Esc** возвращает к нему · **Ctrl+C** дважды — выход'},
  'agentview-current-session': { zh: '当前会话', en: 'current session' , ru: 'текущая сессия'},
  'agentview-untitled': { zh: '未命名', en: 'untitled' , ru: 'без названия'},
  'agentview-summary-empty': { zh: '输入提示词开始', en: 'send a prompt to start' , ru: 'отправьте запрос, чтобы начать'},
  'agentview-none': { zh: '没有会话。在下方输入任务描述并回车，派发第一个后台会话。', en: 'No sessions. Type a task below and press Enter to dispatch your first background session.' , ru: 'Нет сессий. Введите задачу ниже и нажмите Enter, чтобы запустить первую фоновую сессию.'},
  'agentview-empty-prompt': { zh: '派发内容不能为空', en: 'Dispatch prompt cannot be empty' , ru: 'Запрос для запуска не может быть пустым'},
  'agentview-dispatch-unavailable': { zh: '无法派发后台会话——agent 服务不可用', en: 'Cannot dispatch a background session — the agent service is unavailable' , ru: 'Невозможно запустить фоновую сессию — сервис агента недоступен'},
  'agentview-dispatch-failed': { zh: '后台会话创建失败 · {{err}}', en: 'Background session creation failed · {{err}}' , ru: 'Создание фоновой сессии не удалось · {{err}}'},
  'agentview-dispatch-done': { zh: '已派发新会话', en: 'Dispatched a new session' , ru: 'Запущена новая сессия'},
  'agentview-stopped': { zh: '已停止会话', en: 'Session stopped' , ru: 'Сессия остановлена'},
  'agentview-stop-failed': { zh: '无法停止——该会话不是本 TUI 派发的后台会话', en: 'Cannot stop — this is not a background session dispatched by this TUI' , ru: 'Невозможно остановить — это не фоновая сессия, запущенная этим TUI'},
  'agentview-stop-confirm': { zh: '**Ctrl+X** 再次按下删除会话「{{name}}」，其他键取消', en: '**Ctrl+X** again to delete "{{name}}", any other key cancels' , ru: '**Ctrl+X** ещё раз, чтобы удалить «{{name}}», любая другая клавиша — отмена'},
  'agentview-deleted': { zh: '已删除会话「{{name}}」', en: 'Deleted session "{{name}}"' , ru: 'Удалена сессия «{{name}}»'},
  'agentview-delete-failed': { zh: '无法删除会话「{{name}}」', en: 'Could not delete session "{{name}}"' , ru: 'Не удалось удалить сессию «{{name}}»'},
  'agentview-attached': { zh: '已切换到会话', en: 'Attached to session' , ru: 'Переключено на сессию'},
  'agentview-attach-failed': { zh: '切换失败 · {{err}}', en: 'Attach failed · {{err}}' , ru: 'Переключение не удалось · {{err}}'},
  'agentview-current-marker': { zh: '当前', en: 'attached' , ru: 'активна'},
  'agentview-input-placeholder': { zh: '输入任务并回车派发后台会话 · Shift+Enter 派发并立即切换', en: 'Type a task and press Enter to dispatch · Shift+Enter dispatch and attach' , ru: 'Введите задачу и нажмите Enter, чтобы запустить · Shift+Enter — запустить и переключиться'},
  'agentview-hint-list': { zh: '**Enter**/→ 切换 · **Space** 预览 · **Ctrl+X** 停止（两次删除） · **Ctrl+R** 重命名 · **Esc** 退出 · **?** 帮助', en: '**Enter**/→ attach · **Space** peek · **Ctrl+X** stop (twice: delete) · **Ctrl+R** rename · **Esc** exit · **?** help' , ru: '**Enter**/→ переключиться · **Space** просмотр · **Ctrl+X** остановить (дважды: удалить) · **Ctrl+R** переименовать · **Esc** выход · **?** справка'},
  'agentview-hint-rename': { zh: '**Enter** 保存 · Esc 取消', en: '**Enter** to save · Esc to cancel' , ru: '**Enter** — сохранить · Esc — отмена'},
  'agentview-hint-peek': { zh: '输入回复并按 **Enter** 发送 · **Esc** 关闭预览', en: 'Type a reply and press **Enter** to send · **Esc** close' , ru: 'Введите ответ и нажмите **Enter**, чтобы отправить · **Esc** закрыть'},
  'agentview-reply-sent': { zh: '已发送回复', en: 'Reply sent' , ru: 'Ответ отправлен'},
  'agentview-reply-failed': { zh: '回复发送失败 · {{err}}', en: 'Reply failed · {{err}}' , ru: 'Ответ не удался · {{err}}'},
  'agentview-reply-empty': { zh: '回复内容为空', en: 'Reply is empty' , ru: 'Ответ пуст'},
  'agentview-reply-stopped': { zh: '该会话未运行——回车切换进去后回复', en: 'This session is not running — press Enter to attach and reply' , ru: 'Эта сессия не запущена — нажмите Enter, чтобы подключиться и ответить'},
  'agentview-help-title': { zh: '会话总览快捷键', en: 'Session overview shortcuts' , ru: 'Ярлыки обзора сессий'},
  'agentview-help': { zh: '↑/↓      移动 · PgUp/PgDn 翻页\nEnter/→  切换到选中会话（输入框有文字时：派发）；后台化打开时 **Enter** 打开当前会话\nShift+Enter  派发并立即切换\nSpace    打开/关闭预览 · 预览内可输入回复并 Enter 发送\nCtrl+X   停止会话 · 两秒内再次按下删除\nCtrl+R   重命名选中会话\nEsc      关闭预览 → 清空输入 → 退出；后台化打开时返回被转入后台的会话\nCtrl+C   清空输入 · 两次退出\n?        本帮助\n\n后台会话运行在本进程内：TUI 退出后停止，日志保留可 /resume 恢复。', en: '↑/↓      move · PgUp/PgDn page\nEnter/→  attach to the selected session (with input text: dispatch); after backgrounding, **Enter** opens the current session\nShift+Enter  dispatch and attach\nSpace    toggle the peek panel · type a reply inside and Enter to send\nCtrl+X   stop the session · press again within 2s to delete\nCtrl+R   rename the selected session\nEsc      close peek → clear input → exit; after backgrounding, returns to the backgrounded session\nCtrl+C   clear input · twice to exit\n?        this help\n\nBackground sessions run inside this process: they stop when the TUI exits; their logs survive for /resume.' , ru: '↑/↓      перемещение · PgUp/PgDn страница\nEnter/→  подключиться к выбранной сессии (при введённом тексте: отправить); после перевода в фон **Enter** открывает текущую сессию\nShift+Enter  отправить и подключиться\nSpace    показать/скрыть панель просмотра · введите ответ и нажмите Enter для отправки\nCtrl+X   остановить сессию · повторное нажатие в течение 2 с удаляет\nCtrl+R   переименовать выбранную сессию\nEsc      закрыть просмотр → очистить ввод → выход; после перевода в фон возвращает к фоновой сессии\nCtrl+C   очистить ввод · дважды для выхода\n?        эта справка\n\nФоновые сессии работают внутри этого процесса: они останавливаются при выходе из TUI; их журналы сохраняются для /resume.'},
  'agentview-rename-placeholder': { zh: '新的会话名称…', en: 'New session name…' , ru: 'Новое имя сессии…'},
  'agentview-renamed': { zh: '已重命名「{{title}}」', en: 'Renamed "{{title}}"' , ru: 'Переименовано «{{title}}»'},
  'agentview-rename-failed': { zh: '重命名失败', en: 'Rename failed' , ru: 'Не удалось переименовать'},
  'agentview-hint-help': { zh: '**Esc** 关闭帮助', en: '**Esc** to close help' , ru: '**Esc** чтобы закрыть справку'},
  // State group headers.
  'agentview-state-needs-input': { zh: '等待输入', en: 'Needs input' , ru: 'Ожидает ввод'},
  'agentview-state-working': { zh: '运行中', en: 'Working' , ru: 'Выполняется'},
  'agentview-state-completed': { zh: '已完成', en: 'Completed' , ru: 'Завершено'},
  'agentview-state-failed': { zh: '失败', en: 'Failed' , ru: 'Ошибка'},
  'agentview-state-idle': { zh: '空闲', en: 'Idle' , ru: 'Бездействие'},
  'agentview-state-stopped': { zh: '已停止', en: 'Stopped' , ru: 'Остановлено'},
  // Approval panel annotation for a background session's ask.
  'approval-background-agent': { zh: '来自后台会话 {{id}} 的审批请求', en: 'Approval request from background session {{id}}' , ru: 'Запрос на подтверждение от фоновой сессии {{id}}'},
  // Prompt footer session navigation: the ← affordance's hint.
  'input-background-hint-count': { zh: '← {{n}} 个会话等待输入', en: '← {{n}} agents' , ru: '← {{n}} агентов'},
  'input-background-hint-idle': { zh: '← 会话总览', en: '← for agents' , ru: '← к агентам'},

  // ── screens/Settings.tsx (/settings, issue #165) ───────────────────
  'settings-title': { zh: '插件设置', en: 'Plugin settings' , ru: 'Настройки плагинов'},
  'settings-unavailable': { zh: '设置服务未挂载——只读', en: 'settings service absent — read-only' , ru: 'сервис настроек отсутствует — только чтение'},
  'settings-empty': { zh: '没有可配置的插件设置（尚无插件注册设置区块）', en: 'No configurable plugin settings (no plugin has registered a section)' , ru: 'Нет настраиваемых параметров плагинов (ни один плагин не зарегистрировал раздел)'},
  'settings-group-empty': { zh: '此分组没有可配置字段', en: 'No configurable fields in this group' , ru: 'В этой группе нет настраиваемых полей'},
  'settings-section-unavailable': { zh: '命名空间未注册', en: 'namespace not served' , ru: 'пространство имён не обслуживается'},
  'settings-badge-restart': { zh: '重启生效', en: 'applies on restart' , ru: 'применяется после перезапуска'},
  'settings-badge-dirty': { zh: '未保存', en: 'unsaved' , ru: 'не сохранено'},
  'settings-badge-saving': { zh: '保存中', en: 'saving' , ru: 'сохранение'},
  'settings-badge-failed': { zh: '保存失败', en: 'save failed' , ru: 'сохранение не удалось'},
  'settings-field-customized': { zh: '已自定义', en: 'customized' , ru: 'настроено'},
  'settings-field-empty': { zh: '（未设置）', en: '(unset)' , ru: '(не задано)'},
  'settings-field-invalid': { zh: '无效输入', en: 'invalid' , ru: 'недопустимо'},
  'settings-secret-set': { zh: '●●●●●●（已配置）', en: '●●●●●● (configured)' , ru: '●●●●●● (настроено)'},
  'settings-secret-unset': { zh: '（未配置）', en: '(not configured)' , ru: '(не настроено)'},
  'settings-secret-staged': { zh: '（待保存）', en: '(pending save)' , ru: '(ожидает сохранения)'},
  'settings-saved': { zh: '已保存 {{ns}}', en: 'Saved {{ns}}' , ru: 'Сохранено {{ns}}'},
  'settings-save-failed': { zh: '保存 {{ns}} 失败——请重试', en: 'Saving {{ns}} failed — please retry' , ru: 'Сохранение {{ns}} не удалось — попробуйте ещё раз'},
  'settings-secret-ref-reserved': { zh: '凭据 {{ref}} 由宿主保留，写入被拒绝：第三方设置区块不能覆盖宿主共享凭据', en: 'Credential {{ref}} is reserved by the host; write rejected: third-party settings sections cannot overwrite host-shared credentials' , ru: 'Учётные данные {{ref}} зарезервированы хостом; запись отклонена: сторонние разделы настроек не могут перезаписывать общие учётные данные хоста'},
  'settings-hint-list': { zh: '**Enter** 进入/编辑/切换（改动即保存） · Esc 退出', en: '**Enter** open/edit/toggle (auto-saves) · Esc exit' , ru: '**Enter** открыть/изменить/переключить (автосохранение) · Esc выход'},
  'settings-hint-group': { zh: '**Enter** 编辑/切换（改动即保存） · Esc 返回', en: '**Enter** edit/toggle (auto-saves) · Esc back' , ru: '**Enter** изменить/переключить (автосохранение) · Esc назад'},
  'settings-hint-edit': { zh: '**Enter** 确认并保存 · Esc 取消', en: '**Enter** to confirm & save · Esc to cancel' , ru: '**Enter** чтобы подтвердить и сохранить · Esc чтобы отменить'},

  // ── 会话浏览器：行、计数、筛选、预览 ───────────────────────────────
  'session-loading': { zh: '正在读取会话…', en: 'Reading sessions…' , ru: 'Чтение сессий…'},
  'session-list-failed': { zh: '无法读取会话列表 · {{err}}', en: 'Could not read the session list · {{err}}' , ru: 'Не удалось прочитать список сессий · {{err}}'},
  'session-resume-failed': { zh: '恢复会话失败 · {{err}}', en: 'Resuming the session failed · {{err}}' , ru: 'Не удалось возобновить сессию · {{err}}'},
  'session-when-now': { zh: '刚刚', en: 'just now' , ru: 'только что'},
  'session-when-minutes': { zh: '{{n}} 分钟前', en: '{{n}}m ago' , ru: '{{n}} мин назад'},
  'session-when-hours': { zh: '{{n}} 小时前', en: '{{n}}h ago' , ru: '{{n}} ч назад'},
  'session-when-days': { zh: '{{n}} 天前', en: '{{n}}d ago' , ru: '{{n}} дн назад'},
  'session-when-date': { zh: '{{month}} 月 {{day}} 日', en: '{{month}}/{{day}}' , ru: '{{month}}/{{day}}'},
  'session-children': { zh: '{{n}} 个子运行', en: '{{n}} runs' , ru: '{{n}} запусков'},
  'session-kind-root': { zh: '对话', en: 'Conversation' , ru: 'Беседа'},
  'session-kind-fork': { zh: '回溯分支', en: 'Rewound branch' , ru: 'Откаченная ветка'},
  'session-kind-subagent': { zh: '子 agent 运行', en: 'Sub-agent run' , ru: 'Запуск подагента'},
  'session-project-unknown': { zh: '（未记录目录）', en: '(no directory recorded)' , ru: '(каталог не записан)'},
  'session-scope-all': { zh: '全部工作目录', en: 'all working directories' , ru: 'все рабочие каталоги'},
  'session-search-placeholder': { zh: '输入以搜索 · {{scope}}', en: 'Type to search · {{scope}}' , ru: 'Введите для поиска · {{scope}}'},
  'session-workspace-scope': { zh: '工作目录', en: 'Working directory' , ru: 'Рабочий каталог'},
  'session-workspace-switch': { zh: '← 选择目录', en: '← choose directory' , ru: '← выбрать каталог'},
  'session-workspace-select-title': { zh: '选择工作目录', en: 'Choose working directory' , ru: 'Выбрать рабочий каталог'},
  'session-workspace-search-placeholder': { zh: '输入以搜索工作目录', en: 'Type to search working directories' , ru: 'Введите для поиска рабочих каталогов'},
  'session-workspace-all': { zh: '全部工作目录', en: 'All working directories' , ru: 'Все рабочие каталоги'},
  'session-workspace-current': { zh: '当前', en: 'current' , ru: 'текущий'},
  'session-workspace-project-count': { zh: '{{n}} 个目录', en: '{{n}} directories' , ru: '{{n}} каталогов'},
  'session-workspace-all-detail': { zh: '跨目录浏览 · {{n}} 个会话', en: 'browse across directories · {{n}} sessions' , ru: 'просмотр по каталогам · {{n}} сессий'},
  'session-workspace-empty': { zh: '暂无历史会话', en: 'no history yet' , ru: 'истории пока нет'},
  'session-workspace-no-match': { zh: '没有匹配的工作目录', en: 'No matching working directory' , ru: 'Нет подходящего рабочего каталога'},
  // Right-click session menu items (SessionBrowser popup).
  'resume-menu-open': { zh: '打开', en: 'Open' , ru: 'Открыть'},
  'resume-menu-pin': { zh: '固定到顶部', en: 'Pin to top' , ru: 'Закрепить сверху'},
  'resume-menu-unpin': { zh: '取消固定', en: 'Unpin' , ru: 'Открепить'},
  'resume-menu-rename': { zh: '重命名', en: 'Rename' , ru: 'Переименовать'},
  'resume-menu-delete': { zh: '删除', en: 'Delete' , ru: 'Удалить'},
  // Session pinning (SessionBrowser pinned group + toasts).
  'session-pinned-group': { zh: '已固定', en: 'Pinned' , ru: 'Закреплено'},
  'resume-pinned': { zh: '已固定 {{name}}', en: 'Pinned {{name}}' , ru: 'Закреплено {{name}}'},
  'resume-unpinned': { zh: '已取消固定 {{name}}', en: 'Unpinned {{name}}' , ru: 'Откреплено {{name}}'},
  'resume-pin-save-failed': { zh: '固定状态保存失败，未应用更改', en: 'Could not save pin; no change was applied' , ru: 'Не удалось сохранить закрепление; изменения не применены'},
  'session-count-shown': { zh: '{{n}} 个会话', en: '{{n}} sessions' , ru: '{{n}} сессий'},
  'session-count-subagents': { zh: '{{n}} 个子运行已折叠', en: '{{n}} runs folded' , ru: '{{n}} запусков свёрнуто'},
  'session-count-empty': { zh: '{{n}} 个空会话', en: '{{n}} empty' , ru: '{{n}} пустых'},
  'session-clean-confirm': { zh: '清理 {{n}} 个没有对话内容的会话？日志将被永久移除。', en: 'Remove {{n}} sessions that hold no conversation? Their logs are deleted permanently.' , ru: 'Удалить {{n}} сессий без переписки? Их журналы будут удалены безвозвратно.'},
  'session-cleaned': { zh: '已清理 {{n}} 个空会话', en: 'Removed {{n}} empty sessions' , ru: 'Удалено {{n}} пустых сессий'},
  'session-preview-times': { zh: '创建于 {{created}} · 最后活动 {{updated}}', en: 'created {{created}} · last active {{updated}}' , ru: 'создана {{created}} · последняя активность {{updated}}'},
  'session-preview-loading': { zh: '正在读取会话结尾…', en: 'Reading the end of this session…' , ru: 'Чтение конца этой сессии…'},
  'session-preview-empty': { zh: '这个会话没有可预览的往来消息', en: 'No exchanges to preview in this session' , ru: 'Нет сообщений для предпросмотра в этой сессии'},
  'session-toggle-on': { zh: '开', en: 'on' , ru: 'вкл'},
  'session-toggle-off': { zh: '关', en: 'off' , ru: 'выкл'},
  // Three widths of the same hint. The browser picks the widest that fits the
  // terminal, because a hint that wraps costs the rows the list needs and can
  // push its own tail off the bottom of the screen.
  'session-hint-list': { zh: '**Enter** 恢复 · ← 工作目录 · Tab 预览 · 右键菜单 · {{mod}}a 全部目录（{{projects}}） · {{mod}}s 子运行（{{runs}}） · {{mod}}b 本分支 · {{mod}}r 重命名 · {{mod}}p 固定 · {{mod}}d 删除 · {{mod}}x 清空壳 · Esc 退出', en: '**Enter** resume · ← directories · Tab preview · right-click menu · {{mod}}a all directories ({{projects}}) · {{mod}}s runs ({{runs}}) · {{mod}}b this branch · {{mod}}r rename · {{mod}}p pin · {{mod}}d delete · {{mod}}x clean · Esc exit' , ru: '**Enter** возобновить · ← каталоги · Tab предпросмотр · контекстное меню · {{mod}}a все каталоги ({{projects}}) · {{mod}}s запуски ({{runs}}) · {{mod}}b эта ветка · {{mod}}r переименовать · {{mod}}p закрепить · {{mod}}d удалить · {{mod}}x очистить · Esc выход'},
  'session-hint-list-mid': { zh: '**Enter** 恢复 · ← 工作目录 · Tab 预览 · 右键菜单 · {{mod}}a 全部目录 · {{mod}}s 子运行 · {{mod}}r 重命名 · {{mod}}p 固定 · {{mod}}d 删除 · Esc 退出', en: '**Enter** resume · ← directories · Tab preview · right-click menu · {{mod}}a all directories · {{mod}}s runs · {{mod}}r rename · {{mod}}p pin · {{mod}}d delete · Esc exit' , ru: '**Enter** возобновить · ← каталоги · Tab предпросмотр · контекстное меню · {{mod}}a все каталоги · {{mod}}s запуски · {{mod}}r переименовать · {{mod}}p закрепить · {{mod}}d удалить · Esc выход'},
  'session-hint-list-short': { zh: '**Enter** 恢复 · {{mod}}p ★ · ← 目录 · Esc', en: '**Enter** resume · {{mod}}p ★ · ← dirs · Esc' , ru: '**Enter** возобновить · {{mod}}p ★ · ← каталоги · Esc'},
  'session-hint-workspaces': { zh: '**Enter/→** 查看会话 · ↑/↓ 选择 · {{mod}}a 全部目录 · Esc 返回', en: '**Enter/→** view sessions · ↑/↓ choose · {{mod}}a all directories · Esc back' , ru: '**Enter/→** просмотр сессий · ↑/↓ выбрать · {{mod}}a все каталоги · Esc назад'},
  'session-hint-workspaces-short': { zh: '**Enter/→** 查看 · Esc', en: '**Enter/→** view · Esc' , ru: '**Enter/→** просмотр · Esc'},

  // ── picker 通用快捷键提示（整句本地化，zh 不用 "to" 结构；**段** 渲染为粗体主快捷键）─
  'hint-confirm-exit': { zh: '**Enter** 确认 · Esc 退出', en: '**Enter** to confirm · Esc to exit' , ru: '**Enter** чтобы подтвердить · Esc чтобы выйти'},
  'hint-select-exit': { zh: '**Enter** 选择 · Esc 退出', en: '**Enter** to select · Esc to exit' , ru: '**Enter** чтобы выбрать · Esc чтобы выйти'},
  'hint-fill-exit': { zh: '**Enter** 填入命令 · Esc 退出', en: '**Enter** to insert · Esc to exit' , ru: '**Enter** чтобы вставить · Esc чтобы выйти'},
  'hint-rewind-back': { zh: '**Enter** 回退 · Esc 返回', en: '**Enter** to rewind · Esc to back' , ru: '**Enter** чтобы отмотать назад · Esc чтобы вернуться'},
  'statusline-hint-select': { zh: 'esc 返回输入', en: 'esc to return to input' , ru: 'esc чтобы вернуться к вводу'},
  'statusline-hint-working': { zh: 'esc 中断', en: 'esc to interrupt' , ru: 'esc чтобы прервать'},
  'statusline-hint-shortcuts': { zh: '? 查看快捷键', en: '? for shortcuts' , ru: '? — ярлыки'},
  // ── 底栏字段 hover 明细（补充行读出；技术标签 ctx/free/read 等保持不译）──
  'status-detail-of-window': { zh: '的窗口', en: 'of window' , ru: 'окна'},
  'status-detail-session-id': { zh: '会话日志目录与此 id 同名', en: 'the session log directory is named after this id' , ru: 'имя каталога журнала сессии совпадает с этим id'},
  'hint-ext-dialog-input': { zh: '**Enter** 确认 · Esc 取消', en: '**Enter** to confirm · Esc to cancel' , ru: '**Enter** чтобы подтвердить · Esc чтобы отменить'},
  'hint-adjust-done': { zh: '**←/→** 调整 · Enter/Esc 完成', en: '**←/→** to adjust · Enter/Esc to done' , ru: '**←/→** чтобы настроить · Enter/Esc для завершения'},
  'hint-history-search': { zh: '↑/↓ 选择 · **Enter** 确认 · Esc 取消', en: '↑/↓ to navigate · **Enter** to select · Esc to cancel' , ru: '↑/↓ для навигации · **Enter** чтобы выбрать · Esc чтобы отменить'},
  'hint-expand-ctrl-o': { zh: '（ctrl+o 展开）', en: '(ctrl+o to expand)' , ru: '(ctrl+o чтобы развернуть)'},
  // 转录里的超长单行（utils/fold-long-lines.ts）：行尾内联标记。鼠标点整行
  // （工具卡点卡面）即可展开/收起，键盘走 ctrl+o —— 两种都写进文案。
  'long-line-folded': { zh: '… 已折叠 {{n}} 字符（点击或 ctrl+o 展开）', en: '… {{n}} chars folded (click or ctrl+o to expand)' , ru: '… {{n}} символов свёрнуто (нажмите или ctrl+o чтобы развернуть)'},

  // ── components/FileActionsPanel.tsx（点击文件路径弹出的操作菜单）──
  'file-actions-title': { zh: '文件操作', en: 'File actions' , ru: 'Действия с файлом'},
  'file-actions-open': { zh: '打开文件', en: 'Open file' , ru: 'Открыть файл'},
  'file-actions-open-dir': { zh: '打开文件夹', en: 'Open folder' , ru: 'Открыть папку'},
  'file-actions-reveal': { zh: '打开所在文件夹', en: 'Reveal in folder' , ru: 'Показать в папке'},
  'file-actions-copy': { zh: '复制绝对路径', en: 'Copy absolute path' , ru: 'Копировать абсолютный путь'},

  // ── components/ModelPicker.tsx / ThemePicker.tsx / ActivityPicker.tsx / EffortSlider.tsx ──
  'picker-title-model': { zh: '模型', en: 'Model' , ru: 'Модель'},
  'picker-group-recent': { zh: '最近使用', en: 'Recently used' , ru: 'Недавно использованные'},
  'picker-group-count': { zh: '{{count}} 个模型', en: '{{count}} models' , ru: '{{count}} моделей'},
  'hint-model-groups': { zh: '**Enter** 查看模型 · Esc 退出', en: '**Enter** to view models · Esc to exit' , ru: '**Enter** чтобы просмотреть модели · Esc чтобы выйти'},
  'hint-model-back': { zh: '**Enter** 切换模型 · Esc/⌫ 返回上级', en: '**Enter** to switch · Esc/⌫ to go back' , ru: '**Enter** чтобы переключить · Esc/⌫ чтобы вернуться'},
  'picker-title-skills': { zh: '技能', en: 'Skills' , ru: 'Навыки'},
  'skills-loading': { zh: '正在加载技能', en: 'Loading skills' , ru: 'Загрузка навыков'},
  'skills-loading-subtitle': { zh: '正在查询技能注册表…', en: 'Querying the skill registry…' , ru: 'Запрос реестра навыков…'},
  'skills-empty': { zh: '当前会话没有可用技能', en: 'No skills available in this session' , ru: 'В этой сессии нет доступных навыков'},
  'skills-load-failed': { zh: '技能列表加载失败', en: 'Failed to load the skill list' , ru: 'Не удалось загрузить список навыков'},
  'skills-unknown': { zh: '未知技能「{{name}}」', en: 'Unknown skill "{{name}}"' , ru: 'Неизвестный навык «{{name}}»'},
  'skills-not-invocable': { zh: '技能「{{name}}」不可直接调用', en: 'Skill "{{name}}" is not directly invocable' , ru: 'Навык «{{name}}» нельзя вызвать напрямую'},
  'plugin-scene-crashed': { zh: '插件场景「{{id}}」渲染崩溃：{{err}}（已自动关闭）', en: 'Plugin scene "{{id}}" crashed while rendering: {{err}} (closed)' , ru: 'Сцена плагина «{{id}}» аварийно завершилась при отрисовке: {{err}} (закрыто)'},
  'skills-source-bundled': { zh: '内置', en: 'built-in' , ru: 'встроенный'},
  'skills-source-user': { zh: '用户', en: 'user' , ru: 'пользователь'},
  'skills-source-project': { zh: '项目', en: 'project' , ru: 'проект'},
  'skills-source-runtime': { zh: '运行时', en: 'runtime' , ru: 'среда выполнения'},
  'skills-source-custom': { zh: '自定义', en: 'custom' , ru: 'пользовательский'},
  'picker-title-theme': { zh: '颜色主题', en: 'Color theme' , ru: 'Цветовая тема'},
  'picker-title-activity': { zh: '指示器预设', en: 'Indicator preset' , ru: 'Пресет индикатора'},
  'picker-title-color': { zh: '会话强调色', en: 'Session accent color' , ru: 'Акцентный цвет сессии'},
  'picker-title-effort': { zh: '推理强度', en: 'Reasoning effort' , ru: 'Глубина рассуждения'},
  'model-loading': { zh: '正在加载模型', en: 'Loading models' , ru: 'Загрузка моделей'},
  'model-loading-subtitle': { zh: '正在查询 provider…', en: 'Querying the provider…' , ru: 'Запрос провайдера…'},
  'model-switching': { zh: '正在切换模型到 {{name}}…', en: 'Switching model to {{name}}…' , ru: 'Переключение модели на {{name}}…'},
  'model-switched': { zh: '模型已切换为 {{name}}', en: 'Model switched to {{name}}' , ru: 'Модель переключена на {{name}}'},

  // ── components/RewindPicker.tsx ─────────────────────────────────────
  'rewind-title': { zh: '回退', en: 'Rewind' , ru: 'Откат'},
  'rewind-subtitle': { zh: '选择一条消息，将对话回退到该处', en: 'Pick a message to rewind the conversation to' , ru: 'Выберите сообщение, к которому нужно откатить беседу'},
  'rewind-confirm-title': { zh: '将对话回退到这条消息？', en: 'Rewind conversation to this message?' , ru: 'Откатить беседу к этому сообщению?'},
  'rewind-confirm-desc': { zh: '对话从此处重新开始', en: 'conversation restarts here' , ru: 'беседа перезапускается отсюда'},
  'rewind-empty': { zh: '没有可回退的消息', en: 'No messages to rewind to' , ru: 'Нет сообщений для отката'},
  'rewind-last-message': { zh: '最近一条消息', en: 'last message' , ru: 'последнее сообщение'},
  'rewind-none': { zh: '还没有可回退的消息', en: 'Nothing to rewind yet' , ru: 'Пока нечего откатывать'},
  'rewind-done': { zh: '已回退——编辑后按 Enter 重新发送', en: 'Rewound — edit and press Enter to resend' , ru: 'Откат выполнен — отредактируйте и нажмите Enter для повторной отправки'},
  'rewind-mode-default': { zh: '仅回退会话', en: 'Conversation only' , ru: 'Только беседа'},
  'rewind-waiting-plugins': { zh: '正在等待插件决定…（Esc 放弃等待）', en: 'Waiting for plugins… (Esc to stop waiting)' , ru: 'Ожидание плагинов… (Esc для отмены ожидания)'},

  // ── 插件扩展缝（dsh-tui-extensions：决策事件 + 托管对话框 + 快捷键）──
  'ext-action-cancelled': { zh: '操作已被插件取消', en: 'Action cancelled by a plugin' , ru: 'Действие отменено плагином'},
  'ext-action-handled': { zh: '输入已由插件处理', en: 'Input handled by a plugin' , ru: 'Ввод обработан плагином'},
  'ext-decision-pending': { zh: '正在等待插件决定（{{event}}）…', en: 'Waiting for a plugin decision ({{event}})…' , ru: 'Ожидание решения плагина ({{event}})…'},
  'ext-stale-dropped': { zh: '等待插件期间会话已切换，该条输入已丢弃', en: 'Session switched while a plugin decided — the input was dropped' , ru: 'Сессия переключилась во время принятия решения плагином — ввод был отброшен'},
  'ext-compact-stale': { zh: '等待插件期间会话已切换，压缩已取消', en: 'Session switched while a plugin decided — compaction abandoned' , ru: 'Сессия переключилась во время принятия решения плагином — уплотнение отменено'},
  'ext-shortcut-failed': { zh: '插件快捷键 {{combo}} 执行失败', en: 'Plugin shortcut {{combo}} failed' , ru: 'Сбой горячей клавиши плагина {{combo}}'},
  'command-invoke-denied': { zh: '命令调用已被授权文件拒绝（commands.invoke 已撤销）', en: 'Command invocation denied by the grants file (commands.invoke revoked)' , ru: 'Вызов команды запрещён файлом разрешений (commands.invoke отозван)'},
  'command-invoke-denied-owner': {
    zh: '命令 "/{{name}}" 的调用已被拒绝——注册它的插件 "{{owner}}" 已被撤销 commands.invoke',
    en: 'Command "/{{name}}" invocation denied — its owner plugin "{{owner}}" lost commands.invoke',
  ru: 'Вызов команды «/{{name}}» запрещён — её плагин-владелец «{{owner}}» потерял commands.invoke'},
  // /plugins 诊断面（C-070 信任披露 + 协商诊断）
  'plugins-trust-banner': {
    zh: '插件与宿主同进程运行：授权是行为约束而非安全隔离；通过校验 ≠ 插件安全（C-070）。',
    en: 'Plugins run in-process with the host: grants are behavioral constraints, not a security boundary; passing validation ≠ a safe plugin (C-070).',
  ru: 'Плагины выполняются в том же процессе, что и хост: гранты — это поведенческие ограничения, а не граница безопасности; прохождение проверки ≠ безопасный плагин (C-070).'},
  'plugins-host-unavailable': { zh: 'plugin-host 行未挂载：Host Descriptor 与授权矩阵按无信息降级。', en: 'plugin-host row not mounted: Host Descriptor and grant matrix degraded to no-data.' , ru: 'строка plugin-host не смонтирована: Host Descriptor и матрица грантов деградировали до отсутствия данных.'},
  'plugins-contract-dropped': { zh: '已剔除（vendored 哈希漂移）', en: 'dropped (vendored hash drift)' , ru: 'удалён (дрейф хеша vendored)'},
  'plugins-matrix-note': { zh: '授权矩阵（✓ 允许 / · 拒绝；仅显示有足迹的插件——授权文件、效果台账与存储目录的并集）：', en: 'Grant matrix (✓ allowed / · denied; plugins with footprints only — union of the grants file, effect ledger, and storage directory):' , ru: 'Матрица грантов (✓ разрешено / · запрещено; только плагины со следами — объединение файла грантов, журнала эффектов и каталога хранения):'},
  'plugins-matrix-no-registry': { zh: '（权限注册表不可用）', en: '(permission registry unavailable)' , ru: '(реестр прав недоступен)'},
  'plugins-matrix-empty': { zh: '（暂无插件足迹）', en: '(no plugin footprints yet)' , ru: '(пока нет следов плагинов)'},
  'plugins-footprint-overflow': { zh: '…另有 {{count}} 个插件未显示', en: { one: '…{{count}} more plugin not shown', other: '…{{count}} more plugins not shown' } , ru: { one: '…{{count}} дополнительный плагин не показан', other: '…{{count}} дополнительных плагинов не показано' }},
  'plugins-ledger-empty': { zh: '效果台账为空。', en: 'The effect ledger is empty.' , ru: 'Журнал эффектов пуст.'},
  'plugins-ledger-header': { zh: '效果台账（{{file}}）尾 5 条：', en: 'Effect ledger ({{file}}), last 5 records:' , ru: 'Журнал эффектов ({{file}}), последние 5 записей:'},
  'plugins-unknown-subcommand': { zh: '未知子命令：{{sub}}（支持：check <路径>）', en: 'Unknown subcommand: {{sub}} (supported: check <path>)' , ru: 'Неизвестная подкоманда: {{sub}} (поддерживается: check <путь>)'},
  'plugins-check-usage': { zh: '用法：/plugins check <dsh-plugin.json 路径>', en: 'Usage: /plugins check <path-to-dsh-plugin.json>' , ru: 'Использование: /plugins check <путь-к-dsh-plugin.json>'},
  'plugins-check-not-found': { zh: '文件不存在：{{path}}', en: 'File not found: {{path}}' , ru: 'Файл не найден: {{path}}'},
  'plugins-check-invalid-json': { zh: '不是可解析的 JSON：{{err}}', en: 'Not parseable JSON: {{err}}' , ru: 'Не является разбираемым JSON: {{err}}'},
  'plugins-check-spec-unavailable': { zh: 'vendored 规范数据不可用（dsh-ecosystem-spec/），无法校验。', en: 'Vendored spec data unavailable (dsh-ecosystem-spec/); cannot validate.' , ru: 'Данные vendored-спецификации недоступны (dsh-ecosystem-spec/); проверка невозможна.'},
  'plugins-check-schema-failed': { zh: 'schema 校验失败：{{err}}', en: 'Schema validation failed: {{err}}' , ru: 'Ошибка проверки схемы: {{err}}'},
  'plugins-check-invalid': { zh: '语义校验失败：{{err}}', en: 'Semantic validation failed: {{err}}' , ru: 'Ошибка семантической проверки: {{err}}'},
  'plugins-check-state': { zh: '协商结果：{{state}}', en: 'Negotiation decision: {{state}}' , ru: 'Решение согласования: {{state}}'},
  'plugins-grant-hint': {
    zh: '授权方法：在 ~/.dsh-tui/extension-grants.json 的 "grants" 段为插件 id 添加规则（如 { "name": "<权限>", "scope": "<范围>" }），保存即生效、无需重启。',
    en: 'To grant: add a rule for the plugin id under "grants" in ~/.dsh-tui/extension-grants.json (e.g. { "name": "<permission>", "scope": "<scope>" }); saved changes apply immediately, no restart.',
  ru: 'Чтобы выдать грант: добавьте правило для id плагина в раздел «grants» файла ~/.dsh-tui/extension-grants.json (напр. { "name": "<право>", "scope": "<область>" }); сохранённые изменения применяются сразу, без перезапуска.'},
  'plugins-check-grant-hint': {
    zh: '授权方法：在 ~/.dsh-tui/extension-grants.json 的 "grants" 段加入 "{{id}}": [{ "name": "<权限>", "scope": "<范围>" }]；待授权权限：{{perms}}。',
    en: 'To authorize: add "{{id}}": [{ "name": "<permission>", "scope": "<scope>" }] under "grants" in ~/.dsh-tui/extension-grants.json; pending permissions: {{perms}}.',
  ru: 'Чтобы авторизовать: добавьте «{{id}}»: [{ "name": "<право>", "scope": "<область>" }] в раздел «grants» файла ~/.dsh-tui/extension-grants.json; ожидающие права: {{perms}}.'},
  'plugins-check-dropped': { zh: '（宿主描述符已剔除漂移契约：{{dropped}}）', en: '(host descriptor dropped drifted contracts: {{dropped}})' , ru: '(дескриптор хоста удалил смещённые контракты: {{dropped}})'},
  'plugins-check-host-unavailable': { zh: '当前没有 live Host Descriptor；只做静态 manifest 校验，不进行协议支持声明/协商。', en: 'No live Host Descriptor is available; only static manifest validation was performed, no protocol support declaration/negotiation.' , ru: 'Активный Host Descriptor недоступен; выполнена только статическая проверка манифеста, без объявления/согласования поддержки протокола.'},
  'doctor-plugin-generation': { zh: '插件运行时 generation：{{id}}', en: 'Plugin runtime generation: {{id}}' , ru: 'Поколение среды выполнения плагинов: {{id}}'},
  'doctor-plugin-registry': { zh: '插件规范注册表自检：{{state}}', en: 'Plugin-spec registry self-check: {{state}}' , ru: 'Самопроверка реестра спецификаций плагинов: {{state}}'},
  'doctor-plugin-host-missing': { zh: 'plugin-host 行未挂载', en: 'plugin-host row not mounted' , ru: 'строка plugin-host не смонтирована'},
  'ext-dialog-yes': { zh: '是', en: 'Yes' , ru: 'Да'},
  'ext-dialog-no': { zh: '否', en: 'No' , ru: 'Нет'},

  // ── components/ThinkingToggle.tsx + messages/AssistantThinkingMessage.tsx ──
  'thinking-title': { zh: '思考过程显示', en: 'Thinking display' , ru: 'Отображение размышлений'},
  'thinking-subtitle': { zh: '只控制思考过程是否显示，不改变模型的思考行为。', en: 'Only controls whether reasoning is shown; it does not change model behavior.' , ru: 'Управляет только тем, показываются ли рассуждения; поведение модели не меняется.'},
  'thinking-enabled': { zh: '显示', en: 'Shown' , ru: 'Показывать'},
  'thinking-enabled-desc': { zh: '在对话中显示 DeepSeek 的思考过程', en: "Show DeepSeek's reasoning in the conversation" , ru: 'Показывать рассуждения DeepSeek в беседе'},
  'thinking-disabled': { zh: '隐藏', en: 'Hidden' , ru: 'Скрывать'},
  'thinking-disabled-desc': { zh: '隐藏思考过程；模型仍会照常思考', en: 'Hide reasoning; the model will still think as usual' , ru: 'Скрывать рассуждения; модель по-прежнему будет думать как обычно'},
  'thinking-label': { zh: '思考', en: 'Thinking' , ru: 'Размышления'},

  // ── components/HistorySearchDialog.tsx ──────────────────────────────
  'history-search-title': { zh: '搜索历史', en: 'Search history' , ru: 'История поиска'},
  'history-search-placeholder': { zh: '输入以搜索…', en: 'Type to search…' , ru: 'Введите для поиска…'},
  'history-search-empty': { zh: '没有匹配的命令', en: 'No matching commands' , ru: 'Нет подходящих команд'},
  'time-now': { zh: '刚刚', en: 'now' , ru: 'сейчас'},
  'time-minutes-ago': { zh: '{{n}} 分钟前', en: '{{n}}m ago' , ru: '{{n}} мин назад'},
  'time-hours-ago': { zh: '{{n}} 小时前', en: '{{n}}h ago' , ru: '{{n}} ч назад'},
  'time-days-ago': { zh: '{{n}} 天前', en: '{{n}}d ago' , ru: '{{n}} дн назад'},

  // ── screens/Chat.tsx（/ 转录搜索条）─────────────────────────────────
  'search-no-matches': { zh: '无匹配', en: 'no matches' , ru: 'совпадений нет'},

  'rename-usage': { zh: '用法  /rename <新名称>', en: 'Usage  /rename <new title>' , ru: 'Использование  /rename <новое название>'},
  'rename-current': { zh: '当前名称  {{title}}', en: 'Current title  {{title}}' , ru: 'Текущее название  {{title}}'},
  'rename-done': { zh: '已重命名为「{{title}}」', en: 'Renamed to "{{title}}"' , ru: 'Переименовано в «{{title}}»'},
  'compact-summary-folded': { zh: '摘要已折叠', en: 'Summary folded' , ru: 'Сводка свёрнута'},
  'new-message': { zh: '↓ {{n}} 条新消息', en: '↓ 1 new message' , ru: '↓ 1 новое сообщение'},
  'new-messages': { zh: '↓ {{n}} 条新消息', en: '↓ {{n}} new messages' , ru: '↓ {{n}} новых сообщений'},
  'back-to-bottom': { zh: '↓ 回到底部（Enter/End）', en: '↓ back to bottom (Enter/End)' , ru: '↓ вниз к последнему (Enter/End)'},

  // ── components/ThemePicker.tsx ──────────────────────────────────────
  'theme-builtin-base': { zh: '内置 · {{name}} 基底', en: 'Built-in · {{name}} base' , ru: 'Встроенная · база {{name}}'},
  'theme-auto-base': { zh: '内置 · 跟随系统/终端背景自动选择 light/dark', en: 'Built-in · follows the system/terminal background (light/dark)' , ru: 'Встроенная · следует фону системы/терминала (light/dark)'},
  'theme-user-base': { zh: '{{base}} 基底 · ~/.dsh-tui/themes/{{name}}.json', en: '{{base}} base · ~/.dsh-tui/themes/{{name}}.json' , ru: 'база {{base}} · ~/.dsh-tui/themes/{{name}}.json'},
  'theme-plugin-base': { zh: '插件 · {{base}} 基底 · {{name}}', en: 'Plugin · {{base}} base · {{name}}' , ru: 'Плагин · база {{base}} · {{name}}'},

  // ── components/LoadedContextPanel.tsx ───────────────────────────────
  'context-unavailable': { zh: '当前会话没有已加载的上下文', en: 'No loaded context is available for this session' , ru: 'Для этой сессии нет загруженного контекста'},
  'context-panel-sections': { zh: '系统提示词 · {{n}} 段', en: 'System prompt · {{n}} sections' , ru: 'Системный промпт · {{n}} разделов'},
  'context-panel-files': { zh: '工作区指令 · {{n}} 个文件', en: 'Workspace instructions · {{n}} files' , ru: 'Инструкции рабочей области · {{n}} файлов'},
  'context-panel-runtime': { zh: '运行时上下文 · {{n}} 项', en: 'Runtime context · {{n}} items' , ru: 'Контекст выполнения · {{n}} элементов'},
  'context-panel-skills': { zh: '技能 · {{n}}', en: 'Skills · {{n}}' , ru: 'Навыки · {{n}}'},
  'context-panel-tools': { zh: '工具 · {{n}}', en: 'Tools · {{n}}' , ru: 'Инструменты · {{n}}'},

  // ── components/questions/AskUserQuestionPanel.tsx ───────────────────
  'question-provider-occupied': { zh: '⚠️ 问卷通道已被非宿主组件 {{id}} 占用，模型提问可能被代答（本界面未接入问卷）', en: '⚠️ The questionnaire channel is held by a non-host component ({{id}}); model questions may be answered by it (this UI did not take the seat)' , ru: '⚠️ Канал опросника занят сторонним компонентом ({{id}}); вопросы модели может отвечать он (этот интерфейс не занял место)'},
  'question-provider-occupied-unverified': { zh: '⚠️ 问卷通道被一个自报为 {{id}} 的组件占用——身份未经宿主验证，模型提问可能被代答（本界面未接入问卷）', en: '⚠️ The questionnaire channel is held by a component self-reporting as {{id}} — identity not host-verified; model questions may be answered by it (this UI did not take the seat)' , ru: '⚠️ Канал опросника занят компонентом, который выдаёт себя за {{id}} — личность не подтверждена хостом; вопросы модели может отвечать он (этот интерфейс не занял место)'},
  'question-provider-occupied-unknown': { zh: '身份未知', en: 'identity unknown' , ru: 'личность неизвестна'},
  'question-select-or-answer': { zh: '至少选择一个选项，或在最后一行输入回答', en: 'Select at least one option, or type an answer on the last line' , ru: 'Выберите хотя бы один вариант или введите ответ в последней строке'},
  'question-answer-or-check': { zh: '输入回答或勾选选项后再提交', en: 'Type an answer or check options before submitting' , ru: 'Введите ответ или отметьте варианты перед отправкой'},
  'question-type-answer-first': { zh: '先输入回答内容再提交', en: 'Type your answer before submitting' , ru: 'Введите ответ перед отправкой'},
  'question-header-progress': { zh: ' 📋 提问 · 第 {{position}}/{{total}} 题{{remaining}} ', en: ' 📋 Question {{position}}/{{total}} {{remaining}} ' , ru: ' 📋 Вопрос {{position}}/{{total}} {{remaining}} '},
  'question-remaining-more': { zh: ' · 还剩 {{n}} 题', en: ' · {{n}} left' , ru: ' · осталось {{n}}'},
  'question-hint-type': { zh: '输入回答', en: 'Type answer' , ru: 'Введите ответ'},
  'question-hint-paste': { zh: 'Ctrl+V 粘贴', en: 'Ctrl+V paste' , ru: 'Ctrl+V вставить'},
  'question-hint-enter': { zh: 'Enter 提交', en: 'Enter submit' , ru: 'Enter отправить'},
  'question-hint-back': { zh: '↑ 返回选项', en: '↑ back to options' , ru: '↑ к вариантам'},
  'question-hint-esc': { zh: 'Esc 中断', en: 'Esc cancel' , ru: 'Esc отмена'},
  'question-hint-previous': { zh: 'Esc 上一题', en: 'Esc previous question' , ru: 'Esc предыдущий вопрос'},
  'question-hint-cancel': { zh: 'Ctrl+C 取消整批', en: 'Ctrl+C cancel batch' , ru: 'Ctrl+C отменить пакет'},
  'question-hint-selected': { zh: '已选 {{n}}', en: 'Selected {{n}}' , ru: 'Выбрано {{n}}'},
  'question-hint-select': { zh: '↑/↓ 选择', en: '↑/↓ select' , ru: '↑/↓ выбрать'},
  'question-hint-multi': { zh: 'Space 多选', en: 'Space multi-select' , ru: 'Space множественный выбор'},
  'question-hint-attach': { zh: '输入文字附带回答', en: 'Type text to attach an answer' , ru: 'Введите текст, чтобы прикрепить ответ'},
  'question-custom-tab': { zh: '自定义回答', en: 'Custom answer' , ru: 'Произвольный ответ'},
  'question-attached-label': { zh: '（附加：{{label}}）', en: '(attached: {{label}})' , ru: '(прикреплено: {{label}})'},
  'question-direct-input': { zh: '直接输入…', en: 'Type directly…' , ru: 'Введите напрямую…'},
  'question-paste-not-text': { zh: '剪贴板内容是图片或文件，无法作为文字粘贴', en: 'Clipboard holds an image or file — not pastable as text' , ru: 'В буфере обмена изображение или файл — вставить как текст нельзя'},
  'question-paste-too-long': { zh: '粘贴内容过长（最多 {{n}} 个字符），请精简后再试', en: 'Pasted content is too long (max {{n}} characters) — trim it and try again' , ru: 'Вставленный текст слишком длинный (максимум {{n}} символов) — сократите и попробуйте снова'},

  // ── components/approvals/ApprovalPanel.tsx ──────────────────────────
  'approval-waiting': { zh: ' ⏳ 等待审批 · {{tool}} ', en: ' Awaiting approval · {{tool}} ' , ru: ' Ожидание подтверждения · {{tool}} '},
  'approval-external-hint': { zh: '外部来源：该审批未关联当前会话的活跃工具调用，命令文本可能被伪造，请核实后再决定', en: 'External origin: this approval is not tied to a live tool call of this session — the command text may be forged; verify before deciding' , ru: 'Внешнее происхождение: это подтверждение не привязано к активному вызову инструмента этой сессии — текст команды может быть подделан; проверьте перед принятием решения'},
  'approval-proceed': { zh: '要允许这次操作吗？', en: 'Allow this operation?' , ru: 'Разрешить эту операцию?'},
  'approval-yes': { zh: '允许（仅本次）', en: 'Yes, allow once' , ru: 'Да, разрешить один раз'},
  'approval-no': { zh: '拒绝', en: 'No' , ru: 'Нет'},
  'approval-hint': { zh: '↑/↓ 选择 · Enter 确认 · Esc 拒绝', en: '↑/↓ select · Enter confirm · Esc reject' , ru: '↑/↓ выбрать · Enter подтвердить · Esc отклонить'},

  // ── components/Subagent*.tsx ────────────────────────────────────────
  'subagent-model': { zh: '模型', en: 'Model' , ru: 'Модель'},
  'subagent-duration': { zh: '时长', en: 'Duration' , ru: 'Длительность'},
  'subagent-status-label': { zh: '状态', en: 'Status' , ru: 'Статус'},
  'subagent-status-cancelled': { zh: '已取消', en: 'Cancelled' , ru: 'Отменён'},
  'subagent-count-running': { zh: '运行中', en: 'running' , ru: 'выполняется'},
  'subagent-count-completed': { zh: '已完成', en: 'completed' , ru: 'завершён'},
  'subagent-count-failed': { zh: '失败', en: 'failed' , ru: 'ошибка'},
  'subagent-started': { zh: '开始时间', en: 'Started' , ru: 'Запущен'},
  'subagent-completed': { zh: '完成时间', en: 'Completed' , ru: 'Завершено'},
  'subagent-error-label': { zh: '错误', en: 'Error' , ru: 'Ошибка'},
  'subagent-output-label': { zh: '输出', en: 'Output' , ru: 'Вывод'},
  'subagent-no-output': { zh: '暂无输出', en: 'No output yet' , ru: 'Вывода пока нет'},
  'subagent-dashboard-title': { zh: ' 子代理面板 ', en: ' Subagent Dashboard ' , ru: ' Панель субагентов '},
  'subagent-dashboard-hint-basic': { zh: '↑/↓ 浏览 · Esc 关闭', en: '↑/↓ browse · Esc close' , ru: '↑/↓ просмотр · Esc закрыть'},
  'subagent-dashboard-hint-detail': { zh: '↑/↓ 选择 · Enter 查看详情 · Esc 关闭', en: '↑/↓ select · Enter view detail · Esc close' , ru: '↑/↓ выбрать · Enter подробности · Esc закрыть'},
  'subagent-card-prefix': { zh: '子代理：', en: 'Subagent: ' , ru: 'Субагент: '},
  'subagent-tab-summary': { zh: '摘要', en: 'Summary' , ru: 'Сводка'},
  'subagent-no-summary': { zh: '暂无摘要', en: 'No summary yet' , ru: 'Сводки пока нет'},
  'subagent-no-tools': { zh: '暂无工具调用', en: 'No tool calls' , ru: 'Нет вызовов инструментов'},
  'subagent-hint-page': { zh: '切页', en: 'page' , ru: 'страница'},
  'subagent-hint-scroll': { zh: '滚动', en: 'scroll' , ru: 'прокрутка'},
  'subagent-hint-back': { zh: '返回', en: 'back' , ru: 'назад'},
  'subagent-empty-hint': { zh: '让主代理发起 Task 后，子代理会出现在这里', en: 'Subagents appear here once the main agent starts Task delegations' , ru: 'Субагенты появятся здесь, когда основной агент начнёт делегирование задач'},

  // ── background jobs (ctx.jobs): JobCard / JobsPanel / status chip ─────
  'jobs-card-prefix': { zh: '任务：', en: 'job: ' , ru: 'задача: '},
  'jobs-status-running': { zh: '运行中', en: 'running' , ru: 'выполняется'},
  'jobs-status-stopping': { zh: '停止中', en: 'stopping' , ru: 'останавливается'},
  'jobs-status-completed': { zh: '已完成', en: 'completed' , ru: 'завершена'},
  'jobs-status-failed': { zh: '失败', en: 'failed' , ru: 'ошибка'},
  'jobs-status-killed': { zh: '已停止', en: 'killed' , ru: 'остановлена'},
  'jobs-panel-title': { zh: ' 后台任务 ', en: ' Background Jobs ' , ru: ' Фоновые задачи '},
  'jobs-panel-count-running': { zh: '运行中', en: 'running' , ru: 'выполняется'},
  'jobs-panel-count-completed': { zh: '已完成', en: 'completed' , ru: 'завершено'},
  'jobs-panel-count-failed': { zh: '失败', en: 'failed' , ru: 'ошибка'},
  'jobs-panel-empty': { zh: '当前会话暂无后台任务', en: 'No background jobs in the current session' , ru: 'В текущей сессии нет фоновых задач'},
  'jobs-panel-empty-hint': { zh: '后台运行的命令（run_in_background）会出现在这里', en: 'Commands the agent runs in the background appear here' , ru: 'Здесь появляются команды, запущенные агентом в фоне'},
  'jobs-panel-hint': { zh: '↑/↓ 选择（聚焦行显示详情）· k 停止选中任务 · Esc 关闭', en: '↑/↓ select (focused row shows details) · k kill focused job · Esc close' , ru: '↑/↓ выбрать (в фокусе показываются подробности) · k остановить задачу · Esc закрыть'},
  'jobs-panel-started': { zh: '开始', en: 'started' , ru: 'начато'},
  'jobs-panel-finished': { zh: '结束', en: 'finished' , ru: 'завершено'},
  'jobs-panel-command': { zh: '命令', en: 'command' , ru: 'команда'},
  'jobs-panel-output-at': { zh: '输出更新于', en: 'output updated' , ru: 'вывод обновлён'},
  'jobs-panel-no-output-yet': { zh: '（暂无镜像输出——agent 读取后显示）', en: '(no mirrored output yet — appears when the agent reads it)' , ru: '(зеркального вывода пока нет — появится, когда агент его прочитает)'},
  'jobs-toast-completed': { zh: '后台任务完成：{{label}}（{{id}} · 用时 {{duration}}）', en: 'Background job completed: {{label}} ({{id}} · {{duration}})' , ru: 'Фоновая задача завершена: {{label}} ({{id}} · {{duration}})'},
  'jobs-toast-failed': { zh: '后台任务失败：{{label}}（{{id}} · {{detail}}）', en: 'Background job failed: {{label}} ({{id}} · {{detail}})' , ru: 'Ошибка фоновой задачи: {{label}} ({{id}} · {{detail}})'},
  'jobs-toast-killed': { zh: '后台任务已停止：{{label}}（{{id}} · 用时 {{duration}}）', en: 'Background job killed: {{label}} ({{id}} · {{duration}})' , ru: 'Фоновая задача остановлена: {{label}} ({{id}} · {{duration}})'},
  'jobs-kill-failed': { zh: '无法停止任务 {{id}}（任务不存在或任务服务未挂载）', en: 'Could not kill job {{id}} (unknown job or jobs service not mounted)' , ru: 'Не удалось остановить задачу {{id}} (неизвестная задача или сервис задач не подключён)'},
  'jobs-steer-killed': { zh: '我通过 /jobs 面板停止了后台任务 {{id}}（{{label}}）', en: 'I killed background job {{id}} ({{label}}) via the /jobs panel' , ru: 'Я остановил фоновую задачу {{id}} ({{label}}) через панель /jobs'},

  // ── components/questions/PlanReviewPanel.tsx ────────────────────────
  'plan-review-fallback-header': { zh: '计划评审', en: 'Plan review' , ru: 'Ревизия плана'},
  'plan-review-feedback-placeholder': { zh: '输入反馈，告诉模型要改什么…', en: 'Tell the model what to change…' , ru: 'Укажите модели, что изменить…'},
  'plan-review-approve-needs-empty': { zh: '请先清空反馈再批准（或在输入行回车提交反馈）', en: 'Clear the feedback to approve (or press Enter on the input row to send it)' , ru: 'Очистите отзыв для подтверждения (или нажмите Enter в строке ввода, чтобы отправить)'},
  'plan-review-hint': { zh: '↑/↓ 选择 · 1/2 快选 · 打字输入反馈 · Ctrl+V 粘贴 · Enter 提交 · Esc 打断评审', en: '↑/↓ select · 1/2 quick-pick · type feedback · Ctrl+V paste · Enter submit · Esc dismiss' , ru: '↑/↓ выбрать · 1/2 быстрый выбор · ввод отзыва · Ctrl+V вставить · Enter отправить · Esc отменить'},

  // ── providerWizard.ts ────────────────────────────────────────────────
  'provider-unavailable': { zh: '/provider 需要经 dsh profile 启动（settings / credentials / llm-pi-ai 服务未挂载）', en: '/provider requires starting through a dsh profile (settings / credentials / llm-pi-ai services not mounted)' , ru: '/provider требует запуска через профиль dsh (сервисы settings / credentials / llm-pi-ai не подключены)'},
  'provider-q-mode': { zh: '要添加哪种模型提供方？', en: 'Which kind of model provider do you want to add?' , ru: 'Какой тип провайдера моделей вы хотите добавить?'},
  'provider-opt-catalog': { zh: '内置 provider', en: 'Built-in provider' , ru: 'Встроенный провайдер'},
  'provider-opt-catalog-desc': { zh: 'openai、anthropic、deepseek 等内置目录，自动继承端点与协议', en: 'Built-in catalog such as openai, anthropic, deepseek — endpoint and protocol inherited' , ru: 'Встроенный каталог, такой как openai, anthropic, deepseek — конечная точка и протокол наследуются'},
  'provider-opt-custom': { zh: '自定义 API 端点', en: 'Custom API endpoint' , ru: 'Своя конечная точка API'},
  'provider-opt-custom-desc': { zh: 'OpenAI / Anthropic 兼容的网关或自建服务', en: 'An OpenAI/Anthropic-compatible gateway or self-hosted server' , ru: 'Шлюз совместимый с OpenAI/Anthropic или самостоятельный сервер'},
  'provider-q-catalog': { zh: '选择 provider', en: 'Choose a provider' , ru: 'Выберите провайдера'},
  'provider-opt-other-route': { zh: '其他（手动输入路由名）', en: 'Other (enter a route name)' , ru: 'Другое (введите имя маршрута)'},
  'provider-opt-other-route-desc': { zh: '目录里没列出的 catalog 路由', en: 'A catalog route not listed above' , ru: 'Каталожный маршрут, не указанный выше'},
  'provider-q-route-id': { zh: '输入路由名', en: 'Enter a route name' , ru: 'Введите имя маршрута'},
  'provider-q-route-id-detail': { zh: '小写字母开头，可含数字与连字符，如 my-gateway', en: 'Lowercase letter first, digits and dashes allowed, e.g. my-gateway' , ru: 'Сначала строчная буква, допустимы цифры и дефисы, напр. my-gateway'},
  'provider-route-id-invalid': { zh: '路由名不合法：须以小写字母开头，仅含小写字母 / 数字 / 连字符', en: 'Invalid route name: must start with a lowercase letter, only lowercase letters / digits / dashes' , ru: 'Недопустимое имя маршрута: должно начинаться со строчной буквы, только строчные буквы / цифры / дефисы'},
  'provider-q-apikey': { zh: '输入 API key', en: 'Enter the API key' , ru: 'Введите API-ключ'},
  'provider-q-apikey-detail': { zh: '密钥将写入 ~/.dsh/.credentials.yaml（权限 0600），不会出现在会话记录中', en: 'The key is stored in ~/.dsh/.credentials.yaml (mode 0600) and never shown in the transcript' , ru: 'Ключ сохраняется в ~/.dsh/.credentials.yaml (права 0600) и никогда не показывается в журнале сессии'},
  'provider-q-baseurl-choice': { zh: '是否覆盖默认 API 端点（baseURL）？', en: 'Override the default API endpoint (baseURL)?' , ru: 'Переопределить конечную точку API по умолчанию (baseURL)?'},
  'provider-opt-baseurl-skip': { zh: '跳过，使用默认端点', en: 'Skip — use the default endpoint' , ru: 'Пропустить — использовать конечную точку по умолчанию'},
  'provider-opt-baseurl-input': { zh: '现在输入 baseURL', en: 'Enter a baseURL now' , ru: 'Ввести baseURL сейчас'},
  'provider-q-baseurl': { zh: '输入 baseURL', en: 'Enter the baseURL' , ru: 'Введите baseURL'},
  'provider-q-protocol': { zh: '选择 API 协议', en: 'Choose the wire protocol' , ru: 'Выберите сетевой протокол'},
  'provider-protocol-completions-desc': { zh: 'OpenAI Chat Completions 兼容（大多数网关）', en: 'OpenAI Chat Completions compatible (most gateways)' , ru: 'Совместимо с OpenAI Chat Completions (большинство шлюзов)'},
  'provider-protocol-responses-desc': { zh: 'OpenAI Responses API', en: 'OpenAI Responses API' , ru: 'OpenAI Responses API'},
  'provider-protocol-anthropic-desc': { zh: 'Anthropic Messages API', en: 'Anthropic Messages API' , ru: 'Anthropic Messages API'},
  'provider-discovery-running': { zh: '正在探测该端点公布的模型…', en: 'Discovering the models this endpoint advertises…' , ru: 'Обнаружение моделей, которые объявляет эта конечная точка…'},
  'provider-discovery-failed': { zh: '模型探测失败，改为手动输入模型 id', en: 'Model discovery failed — enter model ids manually instead' , ru: 'Обнаружение моделей не удалось — введите идентификаторы моделей вручную'},
  'provider-q-models': { zh: '选择要启用的模型（可在输入行逗号分隔补充）', en: 'Select the models to enable (add more comma-separated on the input row)' , ru: 'Выберите модели для включения (добавьте ещё через запятую в строке ввода)'},
  'provider-q-models-fallback': { zh: '输入模型 id（逗号分隔）', en: 'Enter model ids (comma-separated)' , ru: 'Введите идентификаторы моделей (через запятую)'},
  'provider-models-required': { zh: '自定义端点至少需要一个模型 id', en: 'A custom endpoint needs at least one model id' , ru: 'Пользовательская конечная точка требует хотя бы один идентификатор модели'},
  'provider-q-confirm': { zh: '确认写入该 provider 配置？', en: 'Write this provider configuration?' , ru: 'Записать эту конфигурацию провайдера?'},
  'provider-route-exists-warning': { zh: '⚠ 该路由已有配置，写入将覆盖现有设置', en: '⚠ This route is already configured — writing overwrites it' , ru: '⚠ Этот маршрут уже настроен — запись перезапишет его'},
  'provider-opt-confirm-write': { zh: '写入并启用', en: 'Write and enable' , ru: 'Записать и включить'},
  'provider-opt-confirm-cancel': { zh: '取消', en: 'Cancel' , ru: 'Отмена'},
  'provider-line-route': { zh: '路由：{{route}}', en: 'Route: {{route}}' , ru: 'Маршрут: {{route}}'},
  'provider-line-keyref': { zh: '密钥引用：{{ref}}（已写入 ~/.dsh/.credentials.yaml）', en: 'Key ref: {{ref}} (stored in ~/.dsh/.credentials.yaml)' , ru: 'Ссылка на ключ: {{ref}} (сохранено в ~/.dsh/.credentials.yaml)'},
  'provider-line-keyref-env': { zh: '密钥引用：{{ref}}（进程环境已提供同名变量，跳过写入）', en: 'Key ref: {{ref}} (already in the process environment, write skipped)' , ru: 'Ссылка на ключ: {{ref}} (уже в окружении процесса, запись пропущена)'},
  'provider-line-baseurl': { zh: 'baseURL：{{url}}', en: 'baseURL: {{url}}' , ru: 'baseURL: {{url}}'},
  'provider-line-protocol': { zh: '协议：{{api}}', en: 'Protocol: {{api}}' , ru: 'Протокол: {{api}}'},
  'provider-line-models': { zh: '模型：{{models}}', en: 'Models: {{models}}' , ru: 'Модели: {{models}}'},
  'provider-line-models-catalog': { zh: '模型：整个 catalog（未收窄）', en: 'Models: the whole catalog (not narrowed)' , ru: 'Модели: весь каталог (не сужен)'},
  'provider-rollback-ok': { zh: '已回滚刚写入的密钥', en: 'Rolled back the just-written key' , ru: 'Откатили только что записанный ключ'},
  'provider-rollback-failed': { zh: '密钥回滚失败，请手动检查 ~/.dsh/.credentials.yaml', en: 'Key rollback failed — check ~/.dsh/.credentials.yaml manually' , ru: 'Откат ключа не удался — проверьте ~/.dsh/.credentials.yaml вручную'},
  'provider-write-failed': { zh: 'provider 配置写入失败 · {{{err}}}', en: 'Failed to write the provider configuration · {{{err}}}' , ru: 'Не удалось записать конфигурацию провайдера · {{{err}}}'},
  'provider-cancelled': { zh: '已取消添加 provider', en: 'Provider setup cancelled' , ru: 'Настройка провайдера отменена'},
  'provider-success': { zh: 'provider {{route}} 已添加', en: 'Provider {{route}} added' , ru: 'Провайдер {{route}} добавлен'},
  'provider-switch-hint': { zh: '运行 /model 可切换到新 provider 的模型', en: 'Run /model to switch to the new provider’s models' , ru: 'Запустите /model, чтобы переключиться на модели нового провайдера'},
  'provider-q-switch': { zh: '立即切换到新 provider？', en: 'Switch to the new provider now?' , ru: 'Переключиться на нового провайдера сейчас?'},
  'provider-opt-switch-now': { zh: '切换到 {{model}}', en: 'Switch to {{model}}' , ru: 'Переключиться на {{model}}'},
  'provider-opt-switch-keep': { zh: '保持当前模型', en: 'Keep the current model' , ru: 'Оставить текущую модель'},
  // /provider OAuth 分支（dsh-auth 等插件挂载 ctx.dshAuth 时出现）
  'provider-opt-oauth': { zh: '订阅账号登录（OAuth）', en: 'Subscription sign-in (OAuth)' , ru: 'Вход по подписке (OAuth)'},
  'provider-opt-oauth-desc': { zh: '用 ChatGPT / Claude / Grok 等官方订阅账号登录，无需 API key', en: 'Sign in with an official subscription (ChatGPT / Claude / Grok) — no API key' , ru: 'Войдите через официальную подписку (ChatGPT / Claude / Grok) — без API-ключа'},
  'provider-q-oauth': { zh: '登录哪个订阅账号？', en: 'Sign in to which subscription?' , ru: 'В какую подписку войти?'},
  'provider-oauth-state-in': { zh: '已登录 · 令牌到期 {{time}}', en: 'Signed in · token expires {{time}}' , ru: 'Вход выполнен · срок действия токена {{time}}'},
  'provider-oauth-state-expired': { zh: '已登录但令牌已过期，重新登录即可恢复', en: 'Signed in but the token expired — sign in again to restore' , ru: 'Вход выполнен, но срок действия токена истёк — войдите снова, чтобы восстановить'},
  'provider-q-oauth-signed': { zh: '{{provider}} 已登录，接下来？', en: '{{provider}} is signed in — what next?' , ru: '{{provider}}: вход выполнен — что дальше?'},
  'provider-opt-oauth-relogin': { zh: '重新登录', en: 'Sign in again' , ru: 'Войти снова'},
  'provider-opt-oauth-relogin-desc': { zh: '更换账号或刷新已有凭据', en: 'Switch accounts or refresh the stored credential' , ru: 'Сменить аккаунт или обновить сохранённые учётные данные'},
  'provider-opt-oauth-logout': { zh: '登出', en: 'Sign out' , ru: 'Выйти'},
  'provider-opt-oauth-logout-desc': { zh: '删除本地保存的 OAuth 凭据', en: 'Remove the locally stored OAuth credential' , ru: 'Удалить локально сохранённые учётные данные OAuth'},
  'provider-oauth-none': { zh: '没有可 OAuth 登录的 provider（检查 dsh-auth 插件是否挂载）', en: 'No OAuth-capable providers (check whether the dsh-auth plugin is mounted)' , ru: 'Нет провайдеров с поддержкой OAuth (проверьте, подключён ли плагин dsh-auth)'},
  'provider-oauth-login-ok': { zh: '{{provider}} 登录成功', en: 'Signed in to {{provider}}' , ru: 'Выполнен вход в {{provider}}'},
  'provider-oauth-login-failed': { zh: 'OAuth 登录失败 · {{{err}}}', en: 'OAuth sign-in failed · {{{err}}}' , ru: 'Вход по OAuth не удался · {{{err}}}'},
  'provider-oauth-logout-ok': { zh: '{{provider}} 已登出', en: 'Signed out of {{provider}}' , ru: 'Выполнен выход из {{provider}}'},
  'provider-line-oauth-provider': { zh: '路由：{{provider}}', en: 'Route: {{provider}}' , ru: 'Маршрут: {{provider}}'},
  'provider-line-oauth-flow': { zh: '登录方式：{{flow}}', en: 'Sign-in: {{flow}}' , ru: 'Вход: {{flow}}'},
  'provider-line-oauth-expires': { zh: '令牌到期：{{time}}', en: 'Token expires: {{time}}' , ru: 'Срок действия токена: {{time}}'},
  'provider-line-oauth-out': { zh: '已登出，本地 OAuth 凭据已删除', en: 'Signed out — the stored OAuth credential was removed' , ru: 'Выход выполнен — сохранённые учётные данные OAuth удалены'},
  // /provider 动作层（添加/编辑；删除并入编辑菜单）
  'provider-q-action': { zh: '要做什么？', en: 'What do you want to do?' , ru: 'Что вы хотите сделать?'},
  'provider-opt-action-add': { zh: '添加新 provider', en: 'Add a new provider' , ru: 'Добавить нового провайдера'},
  'provider-opt-action-add-desc': { zh: '内置目录或自定义 API 端点', en: 'Built-in catalog or a custom API endpoint' , ru: 'Встроенный каталог или своя конечная точка API'},
  'provider-opt-action-edit': { zh: '编辑已有 provider', en: 'Edit an existing provider' , ru: 'Редактировать существующего провайдера'},
  'provider-opt-action-edit-desc': { zh: '修改密钥、端点、协议、模型，或删除该 provider', en: 'Change the key, endpoint, protocol, or models — or delete the provider' , ru: 'Изменить ключ, конечную точку, протокол или модели — либо удалить провайдера'},
  'provider-q-edit': { zh: '选择要编辑的 provider', en: 'Choose a provider to edit' , ru: 'Выберите провайдера для редактирования'},
  'provider-none-configured': { zh: '没有已配置的 provider，先用「添加新 provider」创建', en: 'No configured providers — create one with “Add a new provider” first' , ru: 'Нет настроенных провайдеров — сначала создайте одного через «Добавить нового провайдера»'},
  'provider-row-models': { zh: '{{n}} 个模型', en: '{{n}} models' , ru: '{{n}} моделей'},
  'provider-row-catalog': { zh: '整个 catalog', en: 'whole catalog' , ru: 'весь каталог'},
  'provider-row-key-shadowed': { zh: '密钥来自环境变量', en: 'key from the environment' , ru: 'ключ из окружения'},
  // /provider 编辑菜单（选中 provider 后；每项改完立即保存并退出）
  'provider-q-edit-menu': { zh: '{{route}} 要编辑哪一项？', en: 'What would you like to change for {{route}}?' , ru: 'Что вы хотите изменить для {{route}}?'},
  'provider-opt-edit-key': { zh: '编辑 API Key', en: 'Edit API Key' , ru: 'Изменить API-ключ'},
  'provider-opt-edit-baseurl': { zh: '编辑 Base URL', en: 'Edit Base URL' , ru: 'Изменить Base URL'},
  'provider-opt-edit-protocol': { zh: '编辑 wire protocol', en: 'Edit wire protocol' , ru: 'Изменить сетевой протокол'},
  'provider-opt-edit-models': { zh: '编辑模型列表', en: 'Edit model list' , ru: 'Изменить список моделей'},
  'provider-opt-edit-delete': { zh: '删除该 provider', en: 'Delete this provider' , ru: 'Удалить этого провайдера'},
  'provider-opt-edit-delete-desc': { zh: '移除配置与 API key', en: 'Remove the configuration and the API key' , ru: 'Удалить конфигурацию и API-ключ'},
  'provider-key-env-not-editable': { zh: '{{route}} 的 API key 来自环境变量（{{ref}}），无法在此修改', en: '{{route}}’s API key comes from the environment ({{ref}}) and cannot be edited here' , ru: 'API-ключ {{route}} берётся из окружения ({{ref}}) и не может быть изменён здесь'},
  'provider-key-no-ref': { zh: '{{route}} 未配置密钥引用（没有可持久化的 API key），无法在此修改', en: '{{route}} has no credential ref (no persisted API key) and cannot be edited here' , ru: 'У {{route}} нет ссылки на учётные данные (нет сохранённого API-ключа) и он не может быть изменён здесь'},
  'provider-line-key-none': { zh: '密钥：未配置（无密钥引用，环境提供时按需读取）', en: 'Key: none configured (no credential ref; resolved from environment when present)' , ru: 'Ключ: не настроен (нет ссылки на учётные данные; берётся из окружения при наличии)'},
  'provider-key-empty': { zh: 'API key 不能为空，未作修改', en: 'API key cannot be empty — no change made' , ru: 'API-ключ не может быть пустым — изменения не внесены'},
  'provider-q-key-overwrite-confirm': { zh: '密钥 {{ref}} 被多个 provider 共用，确认覆盖？', en: 'Key ref {{ref}} is shared by several providers — overwrite it?' , ru: 'Ссылка на ключ {{ref}} используется несколькими провайдерами — перезаписать?'},
  'provider-opt-key-overwrite-yes': { zh: '覆盖共用密钥', en: 'Overwrite the shared key' , ru: 'Перезаписать общий ключ'},
  'provider-key-overwrite-warning': { zh: '⚠ 该密钥还被 {{routes}} 使用，写入新 key 会同时替换它们的凭据', en: '⚠ This key is also used by {{routes}}; writing a new one rotates the credential for all of them' , ru: '⚠ Этот ключ также используется {{routes}}; запись нового поворачивает учётные данные для всех них'},
  'provider-row-model-missing': { zh: '本次未发现（保留现有配置）', en: 'not found in this discovery (kept as configured)' , ru: 'не найдено в этом обнаружении (сохранено как настроено)'},
  'provider-edit-no-changes': { zh: '没有做任何修改', en: 'No changes made' , ru: 'Изменения не внесены'},
  'provider-line-key-kept': { zh: '密钥：保持不变（{{ref}}）', en: 'Key: unchanged ({{ref}})' , ru: 'Ключ: без изменений ({{ref}})'},
  'provider-line-key-updated': { zh: '密钥引用：{{ref}}（已更新）', en: 'Key ref: {{ref}} (updated)' , ru: 'Ссылка на ключ: {{ref}} (обновлено)'},
  'provider-edit-current': { zh: '当前值：{{value}}', en: 'Current: {{value}}' , ru: 'Текущее: {{value}}'},
  'provider-edit-success': { zh: 'provider {{route}} 已更新', en: 'Provider {{route}} updated' , ru: 'Провайдер {{route}} обновлён'},
  'provider-edit-cancelled': { zh: '已取消编辑 provider', en: 'Provider edit cancelled' , ru: 'Редактирование провайдера отменено'},
  // /provider 删除分支
  'provider-q-delete-confirm': { zh: '确认删除 provider {{route}}？', en: 'Delete provider {{route}}?' , ru: 'Удалить провайдера {{route}}?'},
  'provider-opt-delete-yes': { zh: '删除配置和密钥', en: 'Delete config and key' , ru: 'Удалить конфигурацию и ключ'},
  'provider-delete-cancelled': { zh: '已取消删除 provider', en: 'Provider deletion cancelled' , ru: 'Удаление провайдера отменено'},
  'provider-delete-success': { zh: 'provider {{route}} 已删除', en: 'Provider {{route}} deleted' , ru: 'Провайдер {{route}} удалён'},
  'provider-delete-failed': { zh: '删除失败 · {{{err}}}', en: 'Failed to delete · {{{err}}}' , ru: 'Не удалось удалить · {{{err}}}'},
  'provider-line-deleted-key': { zh: '已删除密钥引用 {{ref}}', en: 'Removed key ref {{ref}}' , ru: 'Удалена ссылка на ключ {{ref}}'},
  'provider-line-deleted-key-shadowed': { zh: '密钥引用 {{ref}} 来自环境变量，未删除', en: 'Key ref {{ref}} comes from the environment; not removed' , ru: 'Ссылка на ключ {{ref}} из окружения; не удалена'},
  'provider-delete-shared-warning': { zh: '⚠ 密钥 {{ref}} 与 {{routes}} 共用，删除本 provider 不会移除该密钥', en: '⚠ Key ref {{ref}} is shared with {{routes}}; deleting this provider keeps the key' , ru: '⚠ Ссылка на ключ {{ref}} общая с {{routes}}; удаление этого провайдера сохраняет ключ'},
  'provider-line-deleted-key-shared': { zh: '密钥引用 {{ref}} 仍被 {{routes}} 使用，未删除', en: 'Key ref {{ref}} is still used by {{routes}}; not removed' , ru: 'Ссылка на ключ {{ref}} всё ещё используется {{routes}}; не удалена'},
  'provider-line-deleted-key-reserved': { zh: '密钥引用 {{ref}} 属于宿主保留命名空间，未删除', en: 'Key ref {{ref}} is in the host-reserved credential namespace; not removed' , ru: 'Ссылка на ключ {{ref}} находится в зарезервированном хостом пространстве учётных данных; не удалена'},
  'provider-unknown-ref-users': { zh: '（引用查询不可用）', en: '(ref query unavailable)' , ru: '(запрос ссылки недоступен)'},
  'provider-line-deleted-key-cleanup-failed': { zh: '密钥引用 {{ref}} 清理失败，请手动检查 ~/.dsh/.credentials.yaml', en: 'Failed to remove key ref {{ref}} — check ~/.dsh/.credentials.yaml manually' , ru: 'Не удалось удалить ссылку на ключ {{ref}} — проверьте ~/.dsh/.credentials.yaml вручную'},
  'provider-delete-key-cleanup-failed': { zh: 'provider {{route}} 已删除，但密钥 {{ref}} 清理失败，请手动处理', en: 'Provider {{route}} deleted, but removing key {{ref}} failed — clean it up manually' , ru: 'Провайдер {{route}} удалён, но удаление ключа {{ref}} не удалось — устраните вручную'},

  // ── commands.ts — slash-command descriptions ─────────────────────────
  // zh-only on purpose: the English text stays in `LOCAL_COMMANDS` (and in
  // the DSH registry for external commands) as the single source of truth,
  // so `localizedDescription` falls back to it whenever the active language
  // has no entry here. `cmd-desc-<name>` keys are resolved at render time,
  // so `/lang` switches apply on the next repaint.
  // Conversation
  'cmd-desc-new': { zh: '新开会话', ru: 'Новый сеанс' },
  'cmd-desc-clear': { zh: '清空当前会话', ru: 'Очистить текущий сеанс' },
  'cmd-desc-compact': { zh: '压缩会话历史', ru: 'Сжать историю сеанса' },
  'cmd-desc-resume': { zh: '恢复历史会话', ru: 'Возобновить прошлый сеанс' },
  'cmd-desc-agentview': { zh: '打开会话总览', ru: 'Открыть обзор сеанса' },
  'cmd-desc-bg': { zh: '当前会话转入后台并打开总览', ru: 'Свернуть сеанс в фон и открыть обзор' },
  'cmd-desc-background': { zh: '当前会话转入后台并打开总览', ru: 'Свернуть сеанс в фон и открыть обзор' },
  'cmd-desc-rename': { zh: '重命名当前会话', ru: 'Переименовать текущий сеанс' },
  'cmd-desc-recap': { zh: '生成最近会话活动摘要（可应用建议标题）', ru: 'Сводка активности недавних сеансов (можно применить предложенные заголовки)' },
  'cmd-desc-quit': { zh: '退出 dsh-tui', ru: 'Выйти из dsh-tui' },
  'cmd-desc-q': { zh: '退出 dsh-tui', ru: 'Выйти из dsh-tui' },
  'cmd-desc-rewind': { zh: '回退会话到历史消息', ru: 'Откатить сеанс к прошлому сообщению' },
  'cmd-desc-tree': { zh: '浏览会话分叉树（回退/分叉/切分支）', ru: 'Дерево ветвлений сеанса (откат / ветка / переключение)' },
  'cmd-desc-fork': { zh: '把当前会话分叉为可恢复副本', ru: 'Сделать ветку текущего сеанса (восстанавливаемая копия)' },
  'cmd-desc-export': { zh: '导出会话为 Markdown 文件', ru: 'Экспорт сеанса в файл Markdown' },
  // Session / environment
  'cmd-desc-context': { zh: '查看已加载的上下文明细', ru: 'Показать загруженный контекст' },
  'cmd-desc-status': { zh: '查看会话状态', ru: 'Показать статус сеанса' },
  'cmd-desc-cost': { zh: '查看会话 token 用量', ru: 'Показать расход токенов сеанса' },
  'cmd-desc-balance': { zh: '查看 DeepSeek 账户余额', ru: 'Показать баланс аккаунта DeepSeek' },
  'cmd-desc-config': { zh: '查看 dsh-tui 配置来源', ru: 'Показать источники конфигурации dsh-tui' },
  'cmd-desc-reload': { zh: '重读偏好文件并立即生效', ru: 'Перечитать файл настроек и применить сразу' },
  'cmd-desc-settings': { zh: '查看和编辑插件设置', ru: 'Просмотр и редактирование настроек плагинов' },
  'cmd-desc-doctor': { zh: '运行环境检查', ru: 'Проверка окружения' },
  'cmd-desc-init': { zh: '在工作目录创建 AGENTS.md', ru: 'Создать AGENTS.md в рабочем каталоге' },
  'cmd-desc-agents': { zh: '查看本会话的子代理', ru: 'Показать подагентов этого сеанса' },
  'cmd-desc-jobs': { zh: '查看本会话的后台任务', ru: 'Показать фоновые задачи этого сеанса' },
  // Model / display
  'cmd-desc-activity': { zh: '切换工作状态指示器预设', ru: 'Переключить пресет индикатора активности' },
  'cmd-desc-preset': { zh: '切换 Agent 预设（含梁神模式）', ru: 'Переключить пресет агента (включая режим Ляншэнь)' },
  'cmd-desc-theme': { zh: '切换配色主题（auto 跟随系统，或内置/静态 JSON/插件主题）', ru: 'Переключить тему оформления (auto — как в системе, либо встроенная / статическая JSON / тема плагина)' },
  'cmd-desc-color': { zh: '设置当前会话强调色（输入框边框与会话标签）', ru: 'Задать акцентный цвет сеанса (рамка поля ввода и метка сеанса)' },
  'cmd-desc-lang': { zh: '切换界面语言（en / zh）', ru: 'Переключить язык интерфейса (en / zh / ru)' },
  'cmd-desc-model': { zh: '查看当前模型', ru: 'Показать текущую модель' },
  'cmd-desc-thinking': { zh: '显示或隐藏思考过程', ru: 'Показать или скрыть ход рассуждений' },
  'cmd-desc-tokens': { zh: '查看会话 token 用量', ru: 'Показать расход токенов сеанса' },
  // Account / policy
  'cmd-desc-provider': { zh: '添加、编辑或删除模型提供方（内置目录或自定义 API 端点）', ru: 'Добавить, изменить или удалить провайдера моделей (встроенный каталог или свой API-эндпоинт)' },
  'cmd-desc-login': { zh: '查看 API 凭证状态', ru: 'Показать статус API-учётных данных' },
  'cmd-desc-logout': { zh: '清除 API 凭证', ru: 'Удалить API-учётные данные' },
  'cmd-desc-add-dir': { zh: '查看文件系统策略范围', ru: 'Показать область действия политик файловой системы' },
  'cmd-desc-hooks': { zh: '查看 hooks 状态', ru: 'Показать статус перехватчиков (hooks)' },
  'cmd-desc-mcp': { zh: '查看 MCP 状态', ru: 'Показать статус MCP' },
  'cmd-desc-skills': { zh: '列出所有可用技能', ru: 'Список всех доступных навыков' },
  'cmd-desc-plugins': { zh: '显示插件契约、授权与台账诊断', ru: 'Показать контракты, права и диагностику плагинов' },
  'cmd-desc-update': { zh: '更新 dsh-tui 并重启', ru: 'Обновить dsh-tui и перезапустить' },
  // Misc
  'cmd-desc-vim': { zh: '切换 vim 模式', ru: 'Переключить режим vim' },
  'cmd-desc-terminal-setup': { zh: '查看终端配置建议', ru: 'Показать рекомендации по настройке терминала' },
  'cmd-desc-connect': { zh: '连接远程机器', ru: 'Подключиться к удалённому компьютеру' },
  'cmd-desc-workspace': { zh: '切换、重命名或打开工作区', ru: 'Переключить, переименовать или открыть рабочую область' },
  'cmd-desc-workspace-resume': { zh: '切换到另一个工作区', en: 'Switch to another workspace', ru: 'Переключиться на другую рабочую область' },
  'cmd-desc-workspace-rename': { zh: '重命名当前工作区', en: 'Rename the current workspace', ru: 'Переименовать текущую рабочую область' },
  'cmd-desc-workspace-open': { zh: '打开路径或工作区 URI', en: 'Open a path or workspace URI', ru: 'Открыть путь или URI рабочей области' },
  // Help / exit
  'cmd-desc-help': { zh: '查看快捷键与命令', ru: 'Показать горячие клавиши и команды' },
  'cmd-desc-restart': { zh: '重启 dsh-tui 并恢复当前会话', ru: 'Перезапустить dsh-tui и восстановить сеанс' },
  'cmd-desc-exit': { zh: '退出 dsh-tui', ru: 'Выйти из dsh-tui' },
  // Registry-injected (external) commands — zh only; en falls back to the
  // registry's own description, and unlisted externals always fall back.
  'cmd-desc-plan': { zh: '切换计划模式（/plan off 退出）', ru: 'Переключить режим плана (/plan off — выход)' },
  'cmd-desc-goal': { zh: '设置或查看会话目标', ru: 'Задать или показать цель сеанса' },
  'cmd-desc-feedback': { zh: '提交使用反馈', ru: 'Отправить отзыв об использовании' },

  // ── /lang command ───────────────────────────────────────────────────
  'lang-current': { zh: '当前语言  {{lang}}', en: 'Current language  {{lang}}', ru: 'Текущий язык  {{lang}}' },
  'lang-switch-hint': { zh: '切换      /lang en | /lang zh', en: 'Switch      /lang en | /lang zh', ru: 'Переключить      /lang en | /lang zh' },
  'lang-persist-hint': { zh: '持久化    ~/.dsh-tui/lang.json（重启后仍生效；DSH_TUI_LANG 优先）', en: 'Persisted    ~/.dsh-tui/lang.json (survives restart; DSH_TUI_LANG wins)', ru: 'Сохраняется    ~/.dsh-tui/lang.json (действует после перезапуска; DSH_TUI_LANG важнее)' },
  'lang-switched': { zh: '语言已切换：{{lang}}（已保存）', en: 'Language switched: {{lang}} (saved)', ru: 'Язык переключён: {{lang}} (сохранено)' },
  'lang-unknown': { zh: '未知语言「{{lang}}」· /lang 查看全部（en / zh）', en: 'Unknown language "{{lang}}" · /lang to view all (en / zh)', ru: 'Неизвестный язык «{{lang}}» · /lang — все доступные (en / zh)' },
  'lang-switch-failed': { zh: '语言「{{lang}}」切换失败（无法写入 ~/.dsh-tui/lang.json）', en: 'Language "{{lang}}" switch failed (cannot write ~/.dsh-tui/lang.json)', ru: 'Не удалось переключить язык «{{lang}}» (нет записи в ~/.dsh-tui/lang.json)' },
  'lang-picker-title': { zh: '界面语言', en: 'UI language', ru: 'Язык интерфейса' },
  'lang-zh-desc': { zh: '简体中文（默认）', en: 'Simplified Chinese (default)', ru: 'Упрощённый китайский (по умолчанию)' },
  'lang-en-desc': { zh: 'English（英文）', en: 'English', ru: 'Английский' },
  'lang-ru-desc': { zh: '俄语界面语言', en: 'Russian UI language', ru: 'Русский язык интерфейса' },

  // ── screens/StatusLine.tsx ───────────────────────────────────────────
  'status-cache-label': { zh: '缓存 ', en: 'cache ', ru: 'кэш ' },

  // ── screens/TrajectoryScene.tsx（issue #80 演进：全屏轨迹场景）──────────
  'traj-title': { zh: '轨迹', en: 'Trajectory', ru: 'Траектория' },
  'traj-totals': { zh: '{{turns}} 轮 · {{steps}} 步', en: '{{turns}} turns · {{steps}} rows', ru: '{{turns}} раундов · {{steps}} шагов' },
  'traj-errors': { zh: '{{n}} 错', en: '{{n}} failed', ru: '{{n}} ошибок' },
  'traj-retries': { zh: '{{n}} 重试', en: '{{n}} retries', ru: '{{n}} повторов' },
  'traj-matches': { zh: '{{n}}/{{total}} 匹配', en: '{{n}}/{{total}} matched', ru: '{{n}}/{{total}} совпадений' },
  'traj-tab-timeline': { zh: '时序', en: 'Timeline', ru: 'Хронология' },
  'traj-tab-hotspot': { zh: '热点', en: 'Hotspot', ru: 'Горячие точки' },
  'traj-hot-tools': { zh: '工具', en: 'Tools', ru: 'Инструменты' },
  'traj-hot-model': { zh: '模型', en: 'Model', ru: 'Модель' },
  'traj-hot-turns': { zh: '轮次', en: 'Turns', ru: 'Раунды' },
  'traj-sort-duration': { zh: '按耗时', en: 'by duration', ru: 'по длительности' },
  'traj-sort-count': { zh: '按次数', en: 'by count', ru: 'по числу' },
  'traj-sort-tokens': { zh: '按 token', en: 'by tokens', ru: 'по токенам' },
  'traj-proj-sequence': { zh: '序号等宽', en: 'even', ru: 'равномерно' },
  'traj-proj-time': { zh: '真实墙钟', en: 'wall-clock', ru: 'реальное время' },
  'traj-proj-compressed': { zh: '压缩空闲', en: 'compressed', ru: 'сжатие' },
  'traj-hint-timeline': {
    zh: '**↑/↓** 移动 · **←/→** 视图 · **[ ]** 跳错 · **{ }** 跳轮 · **/** 查询 · **m** 投影 · **enter** 详情 · **q** 退出',
    en: '**↑/↓** move · **←/→** view · **[ ]** failures · **{ }** turns · **/** query · **m** projection · **enter** detail · **q** exit',
     ru: '**↑/↓** перемещение · **←/→** вид · **[ ]** ошибки · **{ }** раунды · **/** запрос · **m** проекция · **enter** подробно · **q** выход',
  },
  'traj-hint-hotspot': {
    zh: '**↑/↓** 移动 · **←/→** 视图 · **t** 排序 · **enter** 回时序定位 · **q** 退出',
    en: '**↑/↓** move · **←/→** view · **t** sort · **enter** locate in timeline · **q** exit',
     ru: '**↑/↓** перемещение · **←/→** вид · **t** сортировка · **enter** найти в хронологии · **q** выход',
  },
  'traj-hint-query': {
    zh: '**tool:** **kind:** **turn:** **err:** **run:** **>10s** **tok>1k** · 裸词全文 · **enter** 确认 · **esc** 清除',
    en: '**tool:** **kind:** **turn:** **err:** **run:** **>10s** **tok>1k** · bare word = full text · **enter** apply · **esc** clear',
     ru: '**tool:** **kind:** **turn:** **err:** **run:** **>10s** **tok>1k** · слово = полный текст · **enter** применить · **esc** очистить',
  },
  'traj-hint-expanded': {
    zh: '**j/k** 翻页 · **enter/esc** 收起 · **q** 退出',
    en: '**j/k** page · **enter/esc** collapse · **q** exit',
     ru: '**j/k** страницы · **enter/esc** свернуть · **q** выход',
  },
  'traj-hint-failure': { zh: '{{key}} 看完整轨迹', en: '{{key}} for the full trajectory', ru: '{{key}} — полная траектория' },
} as const satisfies Record<string, { zh: I18nText; en?: I18nText; ru?: I18nText }>

export type I18nKey = keyof typeof dict
export type I18nParams = Record<string, string | number>

/** The active language, module-level so non-React modules (channel.ts,
 *  loaded-context.ts) resolve strings without a context. Defaults to `zh`
 *  (the original hard-coded language). */
// Resolved at import time (env var → persisted /lang → OS locale → zh) so
// direct consumers of t() — repro/verify scripts that never reach
// plugin.apply — still get the pinned language instead of a hardcoded zh.
let activeLang: Lang = resolveStartupLang()

/** Emitted on every language switch so React screens can re-render. */
type Listener = () => void
const listeners = new Set<Listener>()

/** Subscribe to language switches (mirrors themePrefs subscription style). */
export function subscribeLang(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The currently active language. */
export function getLang(): Lang {
  return activeLang
}

/** Switch the active language and notify subscribers. */
export function setLang(lang: Lang): void {
  activeLang = lang
  for (const listener of listeners) listener()
}

/** Is a string a valid shipped language code? */
export function isLang(value: unknown): value is Lang {
  return value === 'zh' || value === 'en' || value === 'ru'
}

/**
 * Translate a dictionary key into the active language, substituting
 * `{{name}}` placeholders with params. Missing keys render the key itself
 * so a typo is visible instead of silently blank.
 * @param key - Dictionary key (see dict).
 * @param params - Placeholder values.
 */
export function t(key: I18nKey, params: I18nParams = {}): string {
  const entry = dict[key] as Partial<Record<Lang, I18nText>> | undefined
  return substitute(pickText(entry?.[activeLang] ?? entry?.en, params) ?? key, params)
}

// Cached per shipped language; CLDR-backed and built into Node, so zh always
// selects `other` and en selects `one` exactly at count 1.
const pluralRules: Record<Lang, Intl.PluralRules> = {
  zh: new Intl.PluralRules('zh'),
  en: new Intl.PluralRules('en'),
  ru: new Intl.PluralRules('ru'),
}

/** Resolve plural forms to one template using the `count` param. */
function pickText(text: I18nText | undefined, params: I18nParams): string | undefined {
  if (text === undefined || typeof text === 'string') return text
  const count = Number(params.count)
  const category = pluralRules[activeLang].select(Number.isFinite(count) ? count : 0)
  return category === 'one' ? text.one : text.other
}

/** Substitute `{{name}}` placeholders, leaving unknown names visible. */
function substitute(template: string, params: I18nParams): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

/**
 * Translate a runtime-computed key (e.g. `cmd-desc-${name}`), falling back
 * to the given text when the key is missing or has no entry in the active
 * language — unlike {@link t}, which renders the key itself. Used where the
 * fallback holds the authoritative text (command descriptions: the en copy
 * lives in `LOCAL_COMMANDS` / the DSH registry, the dict carries zh only).
 * @param key - Dictionary key, computed at runtime so it is not type-checked.
 * @param fallback - Text used when no translation exists.
 * @param params - Placeholder values substituted into whichever text wins.
 */
export function tOr(key: string, fallback: string, params: I18nParams = {}): string {
  const entry = (dict as Record<string, Partial<Record<Lang, I18nText>>>)[key]
  return substitute(pickText(entry?.[activeLang], params) ?? fallback, params)
}

/** Read-only view of the dictionary for audits (scripts/verify-i18n.ts). */
export const i18nDict: Readonly<Record<string, { readonly zh?: I18nText; readonly en?: I18nText }>> = dict

// ── persistence (~/.dsh-tui/lang.json) ─────────────────────────────────

/**
 * Parse a persisted `{ lang }` value; anything else yields undefined.
 * @param text - Raw file contents.
 */
export function parseLangPref(text: string): Lang | undefined {
  try {
    const parsed: unknown = JSON.parse(text)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
    const lang = (parsed as Record<string, unknown>).lang
    return isLang(lang) ? lang : undefined
  } catch {
    return undefined
  }
}

/** The persisted `/lang` choice, or undefined when unset or invalid. */
export function readLangPref(dir: string = PREFS_DIR): Lang | undefined {
  try {
    return parseLangPref(readFileSync(join(dir, 'lang.json'), 'utf8'))
  } catch {
    return undefined
  }
}

/** Persist the chosen language (best effort). */
export function writeLangPref(lang: Lang, dir: string = PREFS_DIR): boolean {
  try {
    // 0700 on creation: DATA_DIR hosts private history/logs; match that mode
    // whenever this happens to be the first writer.
    mkdirSync(dir, { recursive: true, mode: 0o700 })
    writeFileSync(join(dir, 'lang.json'), JSON.stringify({ lang }, null, 2))
    return true
  } catch {
    return false
  }
}

/**
 * Guess the user's language from the OS locale (`LC_ALL`, `LC_MESSAGES`,
 * `LANG`). Only consulted when nothing else (env var, cordis.yml `lang`,
 * persisted `/lang` choice) pinned a language. `zh*` maps to zh; every
 * other stated locale (en, but also fr/de/ja/…) maps to en — English is
 * the lingua-franca fallback for a locale we don't ship, and a German
 * user must not get a Chinese UI. The POSIX/C locale means "no locale
 * selected" and conventionally maps to English — importantly it is what
 * CI runners (LANG=C.UTF-8) report, so tests asserting English UI copy
 * stay deterministic. Only an ABSENT locale (typical on Windows, where
 * these POSIX vars don't exist and imply nothing about the user) keeps
 * the zh default.
 */
export function detectLocaleLang(): Lang {
  // `||` (not `??`): an EMPTY locale variable means "unset" and must fall
  // through to the next one — runners and shells sometimes export LC_ALL=''.
  const raw =
    process.env.LC_ALL ||
    process.env.LC_MESSAGES ||
    process.env.LANG ||
    ''
  const locale = raw.split('.')[0]?.toLowerCase() ?? ''
  if (locale === '') return 'zh'
  return locale.startsWith('zh') ? 'zh' : 'en'
}

/**
 * Resolve the startup language: `DSH_TUI_LANG` when it holds a valid value
 * (pinned at process start — the repro/verify scripts rely on this for
 * deterministic UI copy), else the persisted `/lang` choice, else the OS
 * locale guess, else `zh` (the original hard-coded language). The
 * cordis.yml `lang` precedence lives in plugin.apply.
 */
export function resolveStartupLang(): Lang {
  const envLang = process.env.DSH_TUI_LANG
  if (isLang(envLang)) return envLang
  return readLangPref() ?? detectLocaleLang()
}
