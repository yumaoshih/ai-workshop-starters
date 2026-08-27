const fs = require('fs');
const path = require('path');

const bundledHeadlessShell = path.join(__dirname, '.pw-shell/chromium_headless_shell-1234/chrome-linux/headless_shell');
const bundledChromium = path.join(__dirname, '.pw-browsers/chromium-1234/chrome-linux/chrome');
const systemChromium = '/usr/bin/chromium';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (fs.existsSync(systemChromium) ? systemChromium :
    (fs.existsSync(bundledHeadlessShell) ? bundledHeadlessShell :
      (fs.existsSync(bundledChromium) ? bundledChromium : undefined)));

module.exports = {
  testDir: './tests',
  timeout: 30000,
  workers: 1,
  reporter: [['list']],
  use: {
    headless: true,
    viewport: { width: 390, height: 844 },
    browserName: 'chromium',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: ['--no-sandbox']
    }
  }
};
