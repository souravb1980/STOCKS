import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const assetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error('dist/assets not found. Run npm run build first.');
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);
const jsFile = files.find((f) => f.endsWith('.js'));
const cssFile = files.find((f) => f.endsWith('.css'));

if (!jsFile || !cssFile) {
  console.error('JS or CSS chunk not found in dist/assets.');
  process.exit(1);
}

const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');
const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');

// Escape any potential script tags in JS strings if any
const safeJsContent = jsContent.replace(/<\/script>/gi, '<\\/script>');

const singleHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Stock ATH & Nifty 500 Outperformance Analyzer</title>
    <meta name="description" content="Institutional equity analyzer tracking stock all-time high prices, PAT milestones, and cumulative outperformance vs Nifty 500." />
    <meta property="og:title" content="Stock ATH & Nifty 500 Outperformance Analyzer" />
    <meta property="og:description" content="Institutional equity analyzer tracking stock all-time high prices, PAT milestones, and cumulative outperformance vs Nifty 500." />
    <meta property="og:type" content="website" />
    <meta name="theme-color" content="#020617" />
    <style>
${cssContent}
    </style>
  </head>
  <body class="bg-slate-950 text-slate-100">
    <div id="root"></div>
    <script type="module">
${safeJsContent}
    </script>
  </body>
</html>`;

const outPath = path.resolve('public', 'single-file-index.html');
fs.writeFileSync(outPath, singleHtml, 'utf-8');

const distIndexPath = path.resolve('dist', 'index.html');
fs.writeFileSync(distIndexPath, singleHtml, 'utf-8');

console.log('Successfully generated public/single-file-index.html and dist/index.html! Size:', fs.statSync(outPath).size, 'bytes');
