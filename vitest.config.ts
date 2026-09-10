import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: [],
        exclude: ['**/node_modules/**', 'tests/e2e/**', '.claude/**', 'archived/**'],
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            // 정보용 커버리지 — CRM 로직 위주. 임계치 강제는 걸지 않음.
            include: [
                'src/app/admin/crm/**',
                'src/app/api/crm/**',
                'src/lib/**',
                'src/types/crm.ts',
            ],
            exclude: ['**/__tests__/**', '**/*.test.{ts,tsx}'],
        },
    },
});
