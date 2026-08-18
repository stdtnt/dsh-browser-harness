# dsh-browser-harness

通过 [browser-harness](https://github.com/browser-use/browser-harness)（连接智能体与真实浏览器的轻量可编辑 CDP 框架）从 DeepSeek Harness 智能体循环中驱动 Chrome。本插件封装 `browser-harness` CLI，向智能体暴露九个工具，覆盖导航、交互与内容提取。

## 工具

| 工具 | 功能 |
| --- | --- |
| `browser_navigate` | 导航到 URL（首次使用自动开新标签页），或后退/前进；等待页面加载 |
| `browser_info` | 当前标签页、所有标签页与页面指标（视口/滚动/页面尺寸） |
| `browser_tabs` | 按 target id 列出、切换或关闭标签页 |
| `browser_find` | 按名称/角色搜索无障碍树；返回可用于点击的 `id` |
| `browser_click` | 在视口坐标处点击，或按无障碍元素 id 点击（自动滚动到可见） |
| `browser_type` | 在聚焦元素中输入、填充选择器（触发 input/change 事件），或按下特殊按键 |
| `browser_extract` | 通过选择器提取文本/HTML/属性，或执行任意 JS |
| `browser_screenshot` | 截取视口或整页 PNG |
| `browser_wait` | 等待加载、元素出现、网络空闲或固定延时 |

所有工具在 Web UI 中以 generic 卡片呈现。每次调用是一次短命 `browser-harness` 子进程；harness 守护进程在调用之间保持浏览器连接。

## 依赖

- 可用的 `browser-harness` 安装或 checkout（参见其 [install.md](https://github.com/browser-use/browser-harness/blob/main/install.md)），以及守护进程可连接的浏览器（开启远程调试的本地 Chrome，或通过 `BU_NAME`/`BU_CDP_URL` 指定云浏览器）。
- 用于安装插件的 DeepSeek Harness（`dsh` CLI）及目标 profile。

## 安装

```sh
dsh plugin --profile <name> add ./plugins/dsh-browser-harness --office
```

将插件指向你的 harness 二进制。若 `browser-harness` 已在 PATH 中，无需其他配置；若使用未安装的 checkout，在 profile 的 `cordis.patch.yml`（或 `--patch` overlay）中加入插件行配置：

```yaml
- update:
    - id: dsh-browser-harness
      config:
        binPath: /Users/you/projects/browser-harness/browser-harness
        cwd: /Users/you/projects/browser-harness
```

然后启动 profile 并让智能体上网浏览：

```sh
dsh --profile <name>
```

## 配置

所有键均可选；默认值在代码中生效。

| 键 | 默认值 | 含义 |
| --- | --- | --- |
| `binPath` | `browser-harness`（PATH） | 调用的二进制；未安装时使用 checkout 启动器路径 |
| `cwd` | 进程工作目录 | harness 调用的工作目录（`binPath` 为相对路径时设为 checkout 根目录） |
| `timeoutMs` | `120000` | 单次调用墙钟上限 |
| `screenshotDir` | 进程工作目录 | 截图默认保存目录（工具未传 `path` 时生成带时间戳的文件名） |
| `env` | `{}` | 每次调用附加的环境变量，如 `BU_NAME`、`BU_CDP_URL`、`BH_DOMAIN_SKILLS`、`BH_RECORD` |

示例：使用指定的远程（云）浏览器：

```yaml
- update:
    - id: dsh-browser-harness
      config:
        env:
          BU_NAME: r7k2
```

## 工作原理

每个工具构建一段小型 Python 程序（helpers 由 harness CLI 预导入），通过 stdin 管道给 `browser-harness`，并解析程序打印的唯一 `__BH_RESULT__` JSON 标记行。用户提供的字符串一律以 JSON 字面量（同时也是合法的 Python 字面量）嵌入，绝不作为原始源码。调用被取消（智能体中止或超时）时会终止子进程并如实报告；harness 失败时给出 stderr 尾部并提示 `browser-harness --doctor`。

插件自身不启动浏览器——它复用 harness 守护进程及其附着的浏览器。首次导航在没有真实标签页时自动打开新标签页（`ensure_real_tab()`），与 harness 自身约定一致。

## 开发

```sh
npm install
npm run typecheck
npm test          # 使用假 harness 二进制的单元测试
npm run build     # tsc → lib/
```

单元测试用假的 `browser-harness` shim 覆盖 runner 协议、脚本生成器与参数校验，无需浏览器或 harness 安装。真实冒烟：用 `--remote-debugging-port=9222 --user-data-dir=/tmp/bh-test-profile` 启动 Chrome，将 `binPath` 指向 harness checkout 启动器，再从智能体会话驱动各工具。

## 安全说明

`browser_extract`、`browser_click`/`browser_type` 会在所附着的浏览器中执行任意页面 JavaScript 或驱动真实输入事件，且每次调用都会通过 harness CLI 执行 Python——信任级别与 shell 工具相同。附着的浏览器是用户的真实浏览器（或指定的云浏览器），因此部署策略（允许/拒绝、确认）应按照 DSH 扩展 cookbook 放在 `tools/pre-execute` 门禁中。
