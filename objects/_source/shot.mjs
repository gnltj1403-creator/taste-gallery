import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const { chromium } = await import(pathToFileURL(resolve("C:/Users/user/AppData/Local/hairline-look/node_modules/playwright-core/index.mjs")).href);

const [, , htmlPath, outPrefix, countStr] = process.argv;
const count = parseInt(countStr ?? "1", 10);
const url = pathToFileURL(resolve(htmlPath)).href;

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const height = await page.evaluate(() => document.body.scrollHeight);
for (let i = 0; i < count; i++) {
  const y = count === 1 ? 0 : Math.round((height - 800) * (i / (count - 1)));
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(250);
  const out = count === 1 ? `${outPrefix}.png` : `${outPrefix}_${i + 1}.png`;
  await page.screenshot({ path: out });
  console.log("wrote", out);
}
await browser.close();
