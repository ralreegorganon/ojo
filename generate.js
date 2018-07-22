const puppeteer = require('puppeteer')
const PromisePool = require('es6-promise-pool')

/*
const frames = [
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
*/
/*
const frames = [
  {
    name: '00-elevation',
    config: {
      render: {
        elevation: {
          draw: true,
          color: 'colorized'
        },
        rivers: {
          draw: true
        },
        coastline: {
          draw: true
        }
      }
    }
  },
  {
    name: '01-wind',
    config: {
      render: {
        elevation: {
          draw: true,
          color: 'colorized'
        },
        rivers: {
          draw: true
        },
        coastline: {
          draw: true
        },
        wind: {
          draw: true,
          drawWindNetwork: false,
          drawWindVectors: true,
          drawWindVelocity: false
        }
      }
    }
  },
  {
    name: '02-moisture',
    config: {
      render: {
        moisture: {
          draw: true,
          type: 'moisture' // absoluteHumidity, relativeHumidity, moisture
        },
        rivers: {
          draw: true
        },
        coastline: {
          draw: true
        }
      }
    }
  },
  {
    name: '03-biome',
    config: {
      render: {
        biome: {
          draw: true
        },
        rivers: {
          draw: true
        },
        coastline: {
          draw: true
        }
      }
    }
  }
]
*/

const frames = [
  {
    name: 'terrain',
    config: {
      render: {
        elevation: {
          draw: true,
          color: 'colorized'
        },
        rivers: {
          draw: true
        },
        coastline: {
          draw: true
        }
      }
    }
  }
]

const renderings = []

for (let i = 0; i < 1; i++) {
  const iterationFrames = JSON.parse(JSON.stringify(frames))
  const seed = new Date().getTime() * Math.random()
  // const seed = 1245398943713.7385
  iterationFrames.forEach((r) => {
    r.iteration = i
    r.config.seed = seed
    // r.config.temperature = { globalModifier: i * 0.1 }
    // r.config.annotation = `temp global modifier: ${r.config.temperature.globalModifier}`
  })
  renderings.push(...iterationFrames)
}

renderings.forEach((r) => {
  r.config.width = 400
  r.config.height = 400
})

let browser

const render = async (r) => {
  const page = await browser.newPage()
  await page.goto('http://localhost:8080', { timeout: 300000 })
  await page.evaluate((config) => {
    ojo.doItToIt(config)
  }, r.config)
  await page.screenshot({
    path: `output/${r.config.seed}-${r.name}-${`0000${r.iteration}`.slice(-4)}.png`,
    fullPage: true,
    omitBackground: true
  })
  await page.close()
}

const promiseProducer = () => {
  const rendering = renderings.pop()
  return rendering !== undefined ? render(rendering) : null
}

puppeteer.launch().then(async (b) => {
  browser = b
  const pool = new PromisePool(promiseProducer, 8)
  await pool.start()
  await browser.close()
})
