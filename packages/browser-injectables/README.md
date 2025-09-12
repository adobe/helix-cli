# AEM CLI Browser Injectables

This sub-project contains browser scripts injected by the AEM CLI development server.

## Purpose

This package isolates browser-specific code and testing infrastructure from the main AEM CLI, keeping dependencies like Playwright and web-test-runner separate from the core CLI functionality.

## Scripts

### LiveReload (`vendor/livereload.js`)
Provides automatic browser refresh when files change during development. This is a vendored copy of the `livereload-js` library.

### Console Interceptor (`src/console-interceptor.js`) 
Intercepts browser console methods (log, error, warn, info) and forwards them via WebSocket to the development server, allowing browser console output to appear in the terminal.

## Structure

```
packages/browser-injectables/
├── src/
│   └── console-interceptor.js   # Browser console interception script
├── vendor/
│   └── livereload.js            # Vendored copy of livereload-js
├── test/
│   ├── console-log-forwarding.test.js
│   └── livereload-integration.test.js
├── scripts/
│   └── copy-vendor.js           # Copies livereload.js from node_modules
└── web-test-runner.config.js    # Browser test configuration
```

## Development

Scripts are written as self-contained, browser-compatible JavaScript without requiring a build step.

### Installing Dependencies
```bash
cd packages/browser-injectables
npm install
```

This will:
1. Install all dependencies
2. Copy livereload.js to the vendor directory
3. Install Playwright browsers for testing

### Testing
```bash
npm test        # Run all browser tests
npm test:watch  # Run tests in watch mode
```

Tests run in real browsers (Chromium, Firefox, WebKit) via Playwright and web-test-runner.

## Integration with Main Project

The main AEM CLI references these scripts directly:
- `src/server/utils.js` reads `console-interceptor.js` at startup
- `src/server/LiveReload.js` serves `vendor/livereload.js`

No build process is required - the scripts are used as-is.

## CI/CD

Browser injectable tests run conditionally in the main CI workflow when files in this directory change. This keeps the test overhead minimal while ensuring proper coverage.