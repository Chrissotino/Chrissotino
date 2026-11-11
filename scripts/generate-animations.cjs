// Run with Node.js, Playwright, Chromium, FFmpeg and ImageMagick installed.
// CHROMIUM_PATH can select another Chromium executable.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'assets');
const frameCount = 96;
const frameRate = 20;
const variants = [
  ['profile-banner', 1200, 360],
  ['tech-network', 360, 360],
  ['code-flow', 720, 180],
  ['tech-divider', 1200, 24],
];

async function generate() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'chris-animation-'));
  let browser;
  try {
    const source = fs.readFileSync(path.join(assets, 'profile-banner.svg'), 'utf8');
    const illustration = source.indexOf('    <g stroke="url(#accent)"');
    if (illustration < 0) throw new Error('Static banner illustration group not found.');
    const base = source.slice(0, illustration) + '  </g>\n</svg>';
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    });
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body><canvas></canvas></body></html>');
    await page.evaluate(async svg => {
      window.bannerBase = new Image();
      window.bannerBase.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      await window.bannerBase.decode();
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const TAU = Math.PI * 2;
      const cyan = '#67e8f9';
      const violet = '#a78bfa';

      function line(points, color, width = 1, alpha = 1) {
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width;
        ctx.globalAlpha = alpha; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p));
        ctx.stroke(); ctx.restore();
      }
      function dot(x, y, radius, color, glow = 0) {
        ctx.save(); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = glow;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill(); ctx.restore();
      }
      function backdrop(width, height, radius = 18) {
        ctx.save(); ctx.beginPath(); ctx.roundRect(0, 0, width, height, radius); ctx.clip();
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#0d1528'); gradient.addColorStop(1, '#17213d');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
        for (let x = 0; x < width; x += 32) line([[x, 0], [x, height]], '#a5b4fc', 1, .045);
        for (let y = 0; y < height; y += 32) line([[0, y], [width, y]], '#a5b4fc', 1, .045);
        ctx.restore();
      }
      function network(cx, cy, phase) {
        const angle = phase * TAU;
        const vertices = [];
        const tilt = .43 + .12 * Math.sin(angle);
        for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
          const rx = x * Math.cos(angle) + z * Math.sin(angle);
          const rz = -x * Math.sin(angle) + z * Math.cos(angle);
          const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
          const depth = y * Math.sin(tilt) + rz * Math.cos(tilt);
          const scale = 70 / (1 + depth * .13);
          vertices.push({original: [x, y, z], x: cx + rx * scale, y: cy + ry * scale, depth});
        }
        ctx.save(); ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1;
        ctx.globalAlpha = .15; ctx.setLineDash([3, 9]);
        ctx.beginPath(); ctx.ellipse(cx, cy, 142, 126, -.35, 0, TAU); ctx.stroke();
        ctx.restore();
        for (let k = 0; k < 3; k++) {
          const orbit = -angle + k * TAU / 3;
          const ox = 142 * Math.cos(orbit), oy = 126 * Math.sin(orbit);
          dot(cx + ox * Math.cos(-.35) - oy * Math.sin(-.35),
            cy + ox * Math.sin(-.35) + oy * Math.cos(-.35), 2, k % 2 ? violet : cyan, 8);
        }
        let edge = 0;
        for (let i = 0; i < vertices.length; i++) for (let j = i + 1; j < vertices.length; j++) {
          const a = vertices[i], b = vertices[j];
          if (a.original.filter((v, k) => v !== b.original[k]).length !== 1) continue;
          const color = edge % 2 ? violet : cyan;
          line([[a.x, a.y], [b.x, b.y]], color, 1.45, .42 + (a.depth + b.depth + 4) * .05);
          const progress = (phase * 2 + edge * .173) % 1;
          const x = a.x + (b.x - a.x) * progress;
          const y = a.y + (b.y - a.y) * progress;
          dot(x, y, 1.8, '#d9f7ff', 8);
          edge++;
        }
        vertices.sort((a, b) => a.depth - b.depth).forEach(v => {
          line([[cx, cy], [v.x, v.y]], cyan, 1, .11);
          dot(v.x, v.y, 3.5 + (v.depth + 2) * .5, v.depth > 0 ? cyan : violet, 10);
          dot(v.x, v.y, 1.3, '#f1f5f9');
        });
        const pulse = 1 + .16 * Math.sin(angle * 2);
        ctx.save(); ctx.strokeStyle = cyan; ctx.globalAlpha = .35;
        ctx.beginPath(); ctx.arc(cx, cy, 15 * pulse, 0, TAU); ctx.stroke(); ctx.restore();
        dot(cx, cy, 5, '#bfefff', 18);
      }
      function flow(phase) {
        backdrop(720, 180);
        const centers = [120, 360, 600];
        const labels = ['CODE', 'BUILD', 'PLAY'];
        const angle = phase * TAU;
        for (let i = 0; i < 2; i++) {
          const x1 = centers[i] + 45, x2 = centers[i + 1] - 45;
          line([[x1, 75], [x2, 75]], '#637b9c', 1.5, .5);
          line([[x2 - 7, 70], [x2, 75], [x2 - 7, 80]], cyan, 1.5, .65);
          const progress = (phase * 2 + i * .5) % 1;
          for (let tail = 10; tail >= 0; tail--) {
            const p = (progress - tail * .012 + 1) % 1;
            ctx.save(); ctx.globalAlpha = (1 - tail / 11) * .9;
            dot(x1 + (x2 - x1) * p, 75, 2.2, cyan, tail ? 0 : 10); ctx.restore();
          }
        }
        centers.forEach((x, i) => {
          const color = i === 1 ? violet : cyan;
          const brightness = .45 + .35 * (1 + Math.sin(angle * 2 - i * 1.7)) / 2;
          ctx.save(); ctx.fillStyle = '#121e34'; ctx.strokeStyle = color;
          ctx.globalAlpha = brightness; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.roundRect(x - 32, 43, 64, 64, 17); ctx.fill(); ctx.stroke(); ctx.restore();
          if (i === 0) {
            line([[x - 9, 66], [x - 18, 75], [x - 9, 84]], color, 2);
            line([[x + 9, 66], [x + 18, 75], [x + 9, 84]], color, 2);
            line([[x + 4, 63], [x - 4, 87]], color, 2);
          } else if (i === 1) {
            line([[x, 58], [x + 16, 67], [x + 16, 84], [x, 93], [x - 16, 84], [x - 16, 67], [x, 58]], color, 1.7);
            line([[x - 16, 67], [x, 76], [x + 16, 67]], color, 1.7);
            line([[x, 76], [x, 93]], color, 1.7);
          } else {
            line([[x - 8, 61], [x + 15, 75], [x - 8, 89], [x - 8, 61]], color, 2);
          }
          ctx.font = '600 14px Arial, sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = '#cbd5e1'; ctx.fillText(labels[i], x, 139);
        });
      }
      function divider(phase) {
        backdrop(1200, 24, 12);
        const gradient = ctx.createLinearGradient(0, 0, 1200, 0);
        gradient.addColorStop(0, '#67e8f9'); gradient.addColorStop(1, '#a78bfa');
        line([[18, 12], [1182, 12]], gradient, 1, .4);
        for (let i = 0; i < 4; i++) {
          const p = (phase + i / 4) % 1;
          const fade = Math.min(1, p * 18, (1 - p) * 18);
          ctx.save(); ctx.globalAlpha = fade;
          const x = 18 + p * 1164;
          const trail = ctx.createLinearGradient(x - 64, 0, x, 0);
          trail.addColorStop(0, '#67e8f900'); trail.addColorStop(1, '#bcefff');
          line([[Math.max(18, x - 64), 12], [x, 12]], trail, 2);
          dot(x, 12, 2.3, '#e0faff', 8); ctx.restore();
        }
      }
      window.renderFrame = (name, width, height, frame, count) => {
        canvas.width = width; canvas.height = height;
        const phase = frame / count;
        if (name === 'profile-banner') { ctx.drawImage(window.bannerBase, 0, 0); network(970, 184, phase); }
        if (name === 'tech-network') { backdrop(width, height, 24); network(180, 180, phase); }
        if (name === 'code-flow') flow(phase);
        if (name === 'tech-divider') divider(phase);
        return canvas.toDataURL('image/png').split(',')[1];
      };
    }, base);
    for (const [name, width, height] of variants) {
      const folder = path.join(temp, name);
      fs.mkdirSync(folder);
      for (let frame = 0; frame < frameCount; frame++) {
        const png = await page.evaluate(args => window.renderFrame(...args), [name, width, height, frame, frameCount]);
        fs.writeFileSync(path.join(folder, `frame-${String(frame).padStart(3, '0')}.png`), Buffer.from(png, 'base64'));
      }
      execFileSync('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y', '-threads', '2',
        '-framerate', String(frameRate), '-i', path.join(folder, 'frame-%03d.png'),
        '-filter_complex_threads', '2', '-filter_complex',
        '[0:v]split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
        '-gifflags', '+offsetting+transdiff', '-loop', '0', path.join(folder, 'raw.gif'),
      ]);
      // Store unchanged pixels once; preserve rounded transparent corners.
      execFileSync('magick', [path.join(folder, 'raw.gif'), '-coalesce', '-layers', 'Optimize', path.join(assets, name + '.gif')]);
      const bytes = fs.statSync(path.join(assets, name + '.gif')).size;
      console.log(`${name}.gif: ${width}×${height}, ${frameCount} frames, ${(bytes / 1024).toFixed(0)} KiB`);
    }
  } finally {
    if (browser) await browser.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
generate().catch(error => { console.error(error); process.exitCode = 1; });
