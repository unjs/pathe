# pathe

> Normalized paths for Node.js

[![version][npm-v-src]][npm-v-href]
[![downloads][npm-d-src]][npm-d-href]
[![size][size-src]][size-href]

🧪 This package is still experimental and might not handle all cases. Please track issues.

## ❓ Why

For [historical reasons](https://docs.microsoft.com/en-us/archive/blogs/larryosterman/why-is-the-dos-path-character), windows followed MSDos and using backslash `\\` for seperating paths rather than slash `/`. While [modern versions of Windows](https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file?redirectedfrom=MSDN) as well as Node.js on Windows, support slash nowadays!

[Node.js's built in `path` module](https://nodejs.org/api/path.html) in the default operation of the path module varies based on the operating system on which a Node.js application is running. Specifically, when running on a Windows operating system, the path module will assume that Windows-style paths are being used.

This makes lots of trouble of different code behavior between Windows and Posix and it makes problems with different behaviors.

This package is a replacement based on built in `path` module and always ensures path are normalized with slash `/`.

Compared to popular [upath](https://github.com/anodynos/upath), this package tries to privide identical exports of Node.js with normalization on all operations and written in modern ESM/Typescript (upath is written with coffeescript and is not supporting native esm exports).

## 💿 Install

Install using npm or yarn:

```bash
npm i pathe
# or
yarn add pathe
```

Import:

```js
// ESM / Typescript
import { resolve } from 'pathe'

// CommonJS
const { resolve } = require('pathe')
```

## License

MIT. Made with 💖

<!-- Refs -->
[npm-v-src]: https://img.shields.io/npm/v/pathe?style=flat-square
[npm-v-href]: https://npmjs.com/package/pathe

[npm-d-src]: https://img.shields.io/npm/dm/pathe?style=flat-square
[npm-d-href]: https://npmjs.com/package/pathe

[github-actions-src]: https://img.shields.io/github/workflow/status/unjs/pathe/ci/main?style=flat-square
[github-actions-href]: https://github.com/unjs/pathe/actions?query=workflow%3Aci

[size-src]: https://packagephobia.now.sh/badge?p=pathe
[size-href]: https://packagephobia.now.sh/result?p=pathe
