const puppeteer = require('puppeteer')

const renderings = [
  {
    name: 'elevation',
    config: {
      render: {
        elevation: {
          draw: true,
          color: 'colorized'
        }
      }
    }
  },
  {
    name: 'wind',
    config: {
      render: {
        wind: {
          draw: true,
          drawWindNetwork: true,
          drawWindVectors: false,
          drawWindVelocity: true
        }
      }
    }
  },

  {
    name: 'pressure',
    config: {
      render: {
        pressure: {
          draw: true
        }
      }
    }
  },
  {
    name: 'moisture',
    config: {
      render: {
        moisture: {
          draw: true,
          type: 'moisture' // absoluteHumidity, relativeHumidity, moisture
        }
      }
    }
  },
  {
    name: 'relateiveHumidity',
    config: {
      render: {
        moisture: {
          draw: true,
          type: 'relativeHumidity' // absoluteHumidity, relativeHumidity, moisture
        }
      }
    }
  },
  {
    name: 'absoluteHumidity',
    config: {
      render: {
        moisture: {
          draw: true,
          type: 'absoluteHumidity' // absoluteHumidity, relativeHumidity, moisture
        }
      }
    }
  },
  {
    name: 'biome',
    config: {
      render: {
        biome: {
          draw: true
        }
      }
    }
  }
]

renderings.forEach((r) => {
  r.config.width = 100
  r.config.height = 100
})

puppeteer.launch().then(async (browser) => {
  const promises = []
  renderings.forEach((r) => {
    promises.push(browser.newPage().then(async (page) => {
      await page.goto('http://localhost:8080', { timeout: 300000 })
      await page.evaluate((config) => {
        ojo.doItToIt(config)
      }, r.config)
      await page.screenshot({
        path: `output/${r.name}.png`,
        fullPage: true,
        omitBackground: true
      })
    }))
  })
  await Promise.all(promises)
  browser.close()
})
