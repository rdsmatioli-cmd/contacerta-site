// Testes de navegador do site (Playwright, só Chromium). Rodar dentro de tests/e2e: `npm ci --ignore-scripts` e
// `npx playwright test`. O próprio Playwright sobe o site com `python3 -m http.server` em 127.0.0.1 (porta
// E2E_PORTA, padrão 8191) a partir da raiz do repositório, ou de E2E_RAIZ (usado para rodar contra uma cópia).
// Toda requisição HTTP ou WebSocket para fora do servidor local é abortada e registrada, e as dicas de conexão
// (preconnect, dns-prefetch...) para outro host também são registradas (fixtures.mjs). Por baixo disso, o Chromium sobe
// sem proxy (nem o do ambiente: as variáveis *_proxy não passam para ele) e sem resolver nenhum host além de
// 127.0.0.1, então o que escapasse do roteamento falharia no DNS em vez de sair para a internet.
import { defineConfig } from '@playwright/test';
import { BASE, PORTA, RAIZ } from './site.mjs';

const CI = !!process.env.CI;
// Com HTTPS_PROXY/HTTP_PROXY no ambiente, os contextos do Chromium usavam esse proxy mesmo com --no-proxy-server, e o
// --host-resolver-rules deixava de valer (o proxy resolve o nome).
const AMBIENTE_SEM_PROXY = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(https?|all|no)_proxy$/i.test(k)));

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
      env: AMBIENTE_SEM_PROXY,
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
