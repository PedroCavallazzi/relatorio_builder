'use strict'
const puppeteer = require('puppeteer')

let browser

async function initBrowser() {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
}

async function getBrowser() {
  if (!browser) throw new Error('Browser not initialized. Call initBrowser() first.')
  return browser
}

async function closeBrowser() {
  if (browser) await browser.close()
}

module.exports = { initBrowser, getBrowser, closeBrowser }
