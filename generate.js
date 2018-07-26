const puppeteer = require('puppeteer')
const PromisePool = require('es6-promise-pool')
const fs = require('fs')

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
    name: "terrain",
    config: {
      render: {
        elevation: {
          draw: true,
          color: "colorized"
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
];

const renderings = []

for (let i = 0; i < 1; i++) {
  const iterationFrames = JSON.parse(JSON.stringify(frames))
  // const seed = new Date().getTime() * Math.random();
  // const seed = 1245398943713.7385
  const seed = 906958400764.6975
  iterationFrames.forEach((r) => {
    r.iteration = i
    r.config.seed = seed
    // r.config.temperature = { globalModifier: i * 0.1 }
    // r.config.annotation = `temp global modifier: ${r.config.temperature.globalModifier}`
  })
  renderings.push(...iterationFrames)
}

renderings.forEach((r) => {
  r.config.width = 256
  r.config.height = 256
})

let browser

const render = async (r) => {
  const page = await browser.newPage()
  await page.goto('http://localhost:8080', { timeout: 30000000 })
  await page.evaluate((config) => {
    ojo.doItToIt(config)
  }, r.config)

  console.log('done rendering')
  // await page.screenshot({
  //   path: `output/${r.config.seed}-${r.name}-${`0000${r.iteration}`.slice(-4)}.png`,
  //   fullPage: true,
  //   omitBackground: true
  // });

  const selection = await page.evaluate(
    (prefix) => {
      const documents = [window.document]

      const newSources = []
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i]

        const svgSelectAll = doc.querySelectorAll('svg')

        for (let j = 0; j < svgSelectAll.length; j++) {
          const svg = svgSelectAll[j]

          svg.setAttribute('version', '1.1')
          svg.removeAttribute('xmlns')
          svg.removeAttribute('xlink')

          if (!svg.hasAttributeNS(prefix.xmlns, 'xmlns')) {
            svg.setAttributeNS(prefix.xmlns, 'xmlns', prefix.svg)
          }

          if (!svg.hasAttributeNS(prefix.xmlns, 'xmlns:xlink')) {
            svg.setAttributeNS(prefix.xmlns, 'xmlns:xlink', prefix.xlink)
          }

          const source = new XMLSerializer().serializeToString(svg)
          const rect = svg.getBoundingClientRect()

          newSources.push({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            class: svg.getAttribute('class'),
            id: svg.getAttribute('id'),
            name: svg.getAttribute('name'),
            childElementCount: svg.childElementCount,
            source: [prefix.doctype + source]
          })
        }
      }
      return newSources
    },
    {
      doctype: '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">',
      svg: 'http://www.w3.org/2000/svg',
      xlink: 'http://www.w3.org/1999/xlink',
      xmlns: 'http://www.w3.org/2000/xmlns/'
    }
  )

  console.log('done selecting')

  selection.forEach((svg) => {
    fs.writeFile(`output/${r.config.seed}-${r.name}-${`0000${r.iteration}`.slice(-4)}.svg`, svg.source, (err) => {
      if (err) throw err
    })
  })

  console.log('done writing')

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
