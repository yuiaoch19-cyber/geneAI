import fs from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.env.GENEAI_WEB_URL ?? 'http://127.0.0.1:5208'
const API = process.env.GENEAI_API_URL ?? 'http://127.0.0.1:8000/api'
const HIDE =
  '.tsqd-open-btn-container, footer.TanStackRouterDevtools, a[class*="z-999"]{display:none!important}'
const HBB =
  'ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAG'

async function shot(page, name, fullPage = true) {
  await page.waitForTimeout(5300)
  await page.addStyleTag({ content: HIDE })
  await page.screenshot({
    path: `docs/screenshots/${name}.png`,
    fullPage,
    animations: 'disabled',
    timeout: 60000,
  })
}

// 只清理上一次验收遗留的同名记录，不动用户真实数据
const leftovers = await (
  await fetch(
    `${API}/history?q=${encodeURIComponent('验收序列')}&page_size=100`
  )
).json()
for (const item of leftovers.items)
  await fetch(`${API}/history/${item.id}`, { method: 'DELETE' })

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})

// 1-3. Dashboard
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: '欢迎使用 GeneAI' }).waitFor()
console.log('PASS 1-3 dashboard')

// 4-6. analyze
await page.getByRole('link', { name: '开始 DNA 分析' }).click()
await page.waitForURL('**/analysis')
await page.locator('#analysis-name').fill('验收序列')
await page.locator('textarea').first().fill(HBB)
await page.getByRole('button', { name: '分析序列' }).click()
await page.waitForTimeout(1200)
const gc = await page.getByText('58.7%').first().innerText()
console.log('PASS 4-6 analysis', gc)
await shot(page, 'phase10-analysis', false)

// 7. save
await page.getByRole('button', { name: '保存到历史' }).click()
await page.waitForTimeout(1400)
const saved = await page
  .getByText(/已保存 #\d+/)
  .first()
  .innerText()
console.log('PASS 7 save', saved)

// 8-9. history + detail
await page.goto(`${BASE}/history`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
const rows = await page.locator('tbody tr').count()
await page.getByText('验收序列').first().waitFor()
console.log('PASS 8 history rows', rows)
await shot(page, 'phase10-history')
await page.locator('button[aria-label^="查看"]').first().click()
await page.getByRole('dialog').waitFor()
const hasSeq = await page
  .getByRole('dialog')
  .getByText('原始序列（5′ → 3′）')
  .isVisible()
console.log('PASS 9 detail', hasSeq)
await shot(page, 'phase10-detail', false)

// PDF export (step 13 done through real record)
const downloadPromise = page.waitForEvent('download')
await page.getByRole('button', { name: '导出 PDF 报告' }).click()
const download = await downloadPromise
await download.saveAs('docs/screenshots/phase10-report.pdf')
const pdf = fs.readFileSync('docs/screenshots/phase10-report.pdf')
console.log(
  'PASS 13 pdf',
  download.suggestedFilename(),
  pdf.length,
  pdf.subarray(0, 5).toString()
)
await page.keyboard.press('Escape')

// 10-11. compare
await page.goto(`${BASE}/compare`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: '载入演示数据' }).click()
await page.getByRole('button', { name: '开始比对' }).click()
await page.waitForTimeout(1500)
const diffText = await page.getByText('共 2 处差异').first().isVisible()
console.log('PASS 10-11 compare', diffText)
await shot(page, 'phase10-compare')

// 12. visualization with the saved record
await page.goto(`${BASE}/visualization`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const canvases = await page.locator('canvas').count()
const chartBadges = await page.getByText(/个窗口/).count()
console.log(
  'PASS 12 visualization canvases',
  canvases,
  'windowBadges',
  chartBadges
)
await shot(page, 'phase10-visualization')

// Dashboard with real data
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
const statValue = await page
  .locator('main')
  .getByText('总分析次数')
  .first()
  .isVisible()
console.log(
  'PASS dashboard real data',
  statValue,
  await page.locator('canvas').count()
)
await shot(page, 'phase10-dashboard')

console.log('errors', errors.slice(0, 5))
await browser.close()

// 只删除本次验收创建的记录
const list = await (
  await fetch(
    `${API}/history?q=${encodeURIComponent('验收序列')}&page_size=100`
  )
).json()
for (const item of list.items) {
  await fetch(`${API}/history/${item.id}`, { method: 'DELETE' })
}
const stats = await (await fetch(`${API}/stats/overview`)).json()
console.log('cleanup', stats.total_analyses, stats.total_sequences)
