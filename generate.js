const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:8080', { timeout: 300000 })
  await page.evaluate(() => {
    let p = {
      height: 1000,
      width: 1000
    }
    ojo.doItToIt(p)
  })
  await page.screenshot({path: 'output/00-baseline.png', fullPage: true, omitBackground: true})

  await page.goto('http://localhost:8080', { timeout: 300000 })
  await page.evaluate(() => {
    let p = {
      height: 1000,
      width: 1000,
      render: {
        temperature: {
          draw: true
        }
      }
    }
    ojo.doItToIt(p)
  })
  await page.screenshot({path: 'output/01-temperature.png', fullPage: true, omitBackground: true})

  await page.goto('http://localhost:8080', { timeout: 300000 })
  await page.evaluate(() => {
    let p = {
      height: 1000,
      width: 1000,
      render: {
        wind: {
          draw: true,
          drawWindNetwork: true,
          drawWindVectors: false,
          drawWindVelocity: true
        }
      }
    }
    ojo.doItToIt(p)
  })
  await page.screenshot({path: 'output/02-wind.png', fullPage: true, omitBackground: true})

  await page.goto('http://localhost:8080', { timeout: 300000 })
  await page.evaluate(() => {
    let p = {
      height: 1000,
      width: 1000,
      render: {
        moisture: {
          draw: true,
          type: 'moisture' // absoluteHumidity, relativeHumidity, moisture
        }
      }
    }
    ojo.doItToIt(p)
  })
  await page.screenshot({path: 'output/03-moisture.png', fullPage: true, omitBackground: true})

  await page.goto('http://localhost:8080', { timeout: 300000 })
  await page.evaluate(() => {
    let p = {
      height: 1000,
      width: 1000,
      render: {
        moisture: {
          draw: true,
          type: 'relativeHumidity' // absoluteHumidity, relativeHumidity, moisture
        }
      }
    }
    ojo.doItToIt(p)
  })
  await page.screenshot({path: 'output/04-relativeHumidity.png', fullPage: true, omitBackground: true})

  await page.goto('http://localhost:8080', { timeout: 300000 })
  await page.evaluate(() => {
    let p = {
      height: 1000,
      width: 1000,
      render: {
        moisture: {
          draw: true,
          type: 'absoluteHumidity' // absoluteHumidity, relativeHumidity, moisture
        }
      }
    }
    ojo.doItToIt(p)
  })
  await page.screenshot({path: 'output/05-absoluteHumidity.png', fullPage: true, omitBackground: true})

  await page.goto('http://localhost:8080', { timeout: 300000 })
  await page.evaluate(() => {
    let p = {
      height: 1000,
      width: 1000,
      render: {
        biome: {
          draw: true
        }
      }
    }
    ojo.doItToIt(p)
  })
  await page.screenshot({path: 'output/06-biome.png', fullPage: true, omitBackground: true})

  await browser.close()
})()
