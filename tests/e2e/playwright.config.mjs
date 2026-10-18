// Testes de navegador do site (Playwright, só Chromium). Rodar dentro de tests/e2e: `npm ci --ignore-scripts` e
// `npx playwright test`. O próprio Playwright sobe o site com `python3 -m http.server` em 127.0.0.1 (porta
// E2E_PORTA, padrão 8191) a partir da raiz do repositório, ou de E2E_RAIZ (usado para rodar contra uma cópia).
// Toda requisição para fora do servidor local é abortada e registrada (fixtures.mjs); o Chromium também sobe sem
// proxy e sem resolver nenhum host além de 127.0.0.1, então nada sai para a internet, nem por fora do roteamento.
import { defineConfig } from '@playwright/test';
import { BASE, PORTA, RAIZ } from './site.mjs';

const CI = !!process.env.CI;

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mjs',
  outputDir: './test-results',
  fullyParallel: true,
  // O runner ubuntu-latest tem 4 vCPUs: um Chromium por vCPU deixa o job em cerca de meio minuto de testes.
  workers: CI ? '100%' : undefined,
  forbidOnly: CI,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: BASE,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'block',
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
    screenshot: 'only-on-failure',
    trace: CI ? 'retain-on-failure' : 'off',
    launchOptions: {
      args: ['--no-proxy-server', '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1'],
    },
  },
  projects: [
    { name: '390px', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
    { name: '1280px', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `python3 -m http.server ${PORTA} --bind 127.0.0.1 --directory "${RAIZ}"`,
    url: `${BASE}/`,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'ignore',
    timeout: 30_000,
  },
});
