import Bun from 'bun';
import chalk from 'chalk';
import packageJson from './package.json';

const banner = [
  `/*!`,
  ` * ${packageJson.name}@${packageJson.version} ${packageJson.repository.url}`,
  ` * Compiled ${new Date().toUTCString().replace(/GMT/g, 'UTC')}`,
  ` * Copyright (c) ${new Date().getFullYear()} Evitca Studio, "doubleactii"`,
  ` *`,
  ` * ${packageJson.name} is privately licensed.`,
  ` */`,
].join('\n');

function logMessage(level: string, message: string): void {
    const colors: Record<string, string> = { error: '#c42847', info: '#ffa552' };
    const levelFormatted = level.charAt(0).toUpperCase() + level.slice(1);
    const color = colors[level] || '#ffa552';
    console.log(chalk.hex(color)(`[${levelFormatted}]`), `${message}`);
}

const startTime = Date.now();

await Promise.all([
    // ES Module version
    Bun.build({
        entrypoints: ['./src/index.ts'],
        outdir: './dist/esm/',
        naming: `${packageJson.name}.js`,
        banner: banner,
        target: 'browser',
        splitting: false,
        minify: false,
        format: 'esm',
        sourcemap: 'external'
    }),
    // ES Module minified version
    Bun.build({
        entrypoints: ['./src/index.ts'],
        outdir: './dist/min/',
        naming: `${packageJson.name}.min.js`,
        minify: true,
        banner: banner,
        target: 'browser',
        splitting: false,
        format: 'esm',
        sourcemap: 'external'
    }),
    // IIFE version
    Bun.build({
        entrypoints: ['./src/index.ts'],
        outdir: './dist/iife/',
        naming: `${packageJson.name}-iife.js`,
        format: 'iife',
        minify: false,
        banner: banner,
        target: 'browser',
        splitting: false,
        sourcemap: 'external'
    }),
    // IIFE minified version
    Bun.build({
        entrypoints: ['./src/index.ts'],
        outdir: './dist/iife/',
        naming: `${packageJson.name}-iife.min.js`,
        format: 'iife',
        minify: true,
        banner: banner,
        target: 'browser',
        splitting: false,
        sourcemap: 'external'
    })
]);

// Replace VERSION_REPLACE_ME with actual version in all generated files
const filesToUpdate = [
    `dist/esm/${packageJson.name}.js`,
    `dist/min/${packageJson.name}.min.js`,
    `dist/iife/${packageJson.name}-iife.js`,
    `dist/iife/${packageJson.name}-iife.min.js`
];

for (const file of filesToUpdate) {
    try {
        const content = await Bun.file(file).text();
        const updatedContent = content.replace(/VERSION_REPLACE_ME/g, packageJson.version);
        await Bun.write(file, updatedContent);
    } catch (error) {
        // File might not exist, that's okay
    }
}

const elapsed = Date.now() - startTime;
logMessage('info', `Build completed in ${elapsed}ms`);