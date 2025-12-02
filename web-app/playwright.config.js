import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
    testDir: './tests/e2e',
    timeout: 120 * 1000,
    use: {
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        baseURL: 'http://127.0.0.1:5173'
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ],
    webServer: {
        command: 'npm run dev -- --host',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: !process.env.CI
    }
});
