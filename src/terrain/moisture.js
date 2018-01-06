import { mapParameters } from 'parameters'
import { elevationInMetersAsl, temperatureInCelsius } from 'terrain/conversion'

// pressure in kPa, temperature in C, returns density of water vapor in air (g/m^3)
function vaporPressureToAbsoluteHumidty(pressure, temperature) {
  const p = pressure * 1000
  const t = temperature + 273.15
  const d = 2.16679 * p / t
  return d
}

// density of water vapor in air (g/m^3), temperature in C, returns pressure in kPa
function absoluteHumidtyToVaporPressure(density, temperature) {
  const d = density
  const t = temperature + 273.15
  const p = d * t / 2.16679 / 1000
  return p
}

// temperature in C, returns vapor pressure in kPa
function buckEquationOverLiquidWater(temperature) {
  // https://en.wikipedia.org/wiki/Arden_Buck_equation
  const saturationVaporPressure = 0.61121 * Math.exp((18.678 - temperature / 234.5) * (temperature / (257.14 + temperature)))
  return saturationVaporPressure
}

// temperature in C, returns vapor pressure in kPa
function buckEquationOverIce(temperature) {
  // https://en.wikipedia.org/wiki/Arden_Buck_equation
  const saturationVaporPressure = 0.61115 * Math.exp((23.036 - temperature / 333.7) * (temperature / (279.82 + temperature)))
  return saturationVaporPressure
}

function buckEquation(temperature) {
  const saturationVaporPressure = temperature > 0 ? buckEquationOverLiquidWater(temperature) : buckEquationOverIce(temperature)
  return saturationVaporPressure
}

function relativeHumidity(absoluteHumidity, temperature) {
  const saturationVaporPressure = buckEquation(temperature)
  const actualVaporPressure = absoluteHumidtyToVaporPressure(absoluteHumidity, temperature)
  return actualVaporPressure / saturationVaporPressure
}

// mm / day
// http://edis.ifas.ufl.edu/pdffiles/ae/ae45900.pdf
function evaporationRate(temperature, pressure, solarInsolation, windSpeed, saturationVaporPressure, actualVaporPressure) {
  const g = 0.082
  const r = solarInsolation * 3.6
  const t = temperature
  const u2 = windSpeed
  const es = saturationVaporPressure
  const ea = actualVaporPressure
  const psychrometric = 0.000665 * pressure
  const slope = 4098 * (0.6108 * Math.exp(17.27 * t / (t + 237.3))) / (t + 237.3) ** 2
  const er = (0.408 * slope * (r - g) + psychrometric * (900 / (t + 273)) * u2 * (es - ea)) / (slope + psychrometric * (1 + 0.34 * u2))
  return er
}

function baseline(polygons) {
  polygons.forEach((p) => {
    const t = temperatureInCelsius(p.temperature)
    const saturationVaporPressure = buckEquation(t)

    if (p.featureType === 'Ocean' || p.featureType === 'Lake') {
      p.moisture = 400
      p.relativeHumidity = 0.8

      const actualVaporPressure = p.relativeHumidity * saturationVaporPressure
      const absoluteHumidity = vaporPressureToAbsoluteHumidty(actualVaporPressure, t)
      p.absoluteHumidity = absoluteHumidity
    } else {
      p.moisture = 0
      p.relativeHumidity = 0

      const actualVaporPressure = p.relativeHumidity * saturationVaporPressure
      const absoluteHumidity = vaporPressureToAbsoluteHumidty(actualVaporPressure, t)
      p.absoluteHumidity = absoluteHumidity
    }

    // p.moisture = 0.3 * (1 - Math.max(p.elevation, mapParameters.seaLevel))
  })
}

function smooth(polygons) {
  polygons.forEach((p) => {
    if (p.featureType === 'Ocean') {
      return
    }

    let averageMoisture = p.moisture
    let c = 1
    p.neighbors.forEach((n) => {
      if (n.featureType !== 'Ocean') {
        averageMoisture += n.moisture
        c += 1
      }
    })
    averageMoisture /= c
    p.moisture = averageMoisture
  })
}

function propagate(diagram, polygons) {
  const sinks = new Set()
  polygons.forEach((p) => {
    sinks.add(p)
  })

  polygons.forEach((p) => {
    sinks.delete(p.wind.target)
  })

  for (let i = 0; i < mapParameters.moisture.iterations; i++) {
    const visited1 = new Set()
    sinks.forEach((s) => {
      if (s.featureType === 'Ocean') {
        let current = s
        let next = current.wind.target
        while (next !== undefined) {
          if (visited1.has(current) && visited1.has(next)) {
            break
          }

          if (current.featureType === 'Ocean') {
            current.moisture = 400
            current.relativeHumidity = 0.8
            const t = temperatureInCelsius(current.temperature)
            const saturationVaporPressure = buckEquation(t)
            const actualVaporPressure = current.relativeHumidity * saturationVaporPressure
            const absoluteHumidity = vaporPressureToAbsoluteHumidty(actualVaporPressure, t)
            current.absoluteHumidity = absoluteHumidity
          }

          const ce = elevationInMetersAsl(current.elevation)
          const ne = elevationInMetersAsl(next.elevation)

          const ct = temperatureInCelsius(current.temperature)
          const nt = temperatureInCelsius(next.temperature)

          const csvp = buckEquation(ct)

          const cavp = absoluteHumidtyToVaporPressure(current.absoluteHumidity, ct)

          const crh = cavp / csvp

          const wf = Math.max(2, current.wind.velocity)

          const er = evaporationRate(ct, current.pressure, current.solarInsolation, current.wind.velocity, csvp, cavp)

          const possibleEr = Math.min(current.moisture, er)

          current.moisture = Math.max(0, current.moisture - possibleEr)
          current.absoluteHumidity += possibleEr / 100

          if (ne > ce) {
            const tempChange = (ne - ce) ** 1 / 1000 * 0.03
            const orographicLiftRh = relativeHumidity(current.absoluteHumidity, ct - tempChange)
            if (orographicLiftRh > 1) {
              const diff = Math.min(current.absoluteHumidity, (orographicLiftRh - 1) * current.absoluteHumidity) / wf
              current.moisture += diff * 100
              current.absoluteHumidity -= diff

              if (next.target !== undefined && next.target.elevation > ne) {
                const nTempChange = (next.target.elevation - ne) ** 1 / 1000 * 0.03
                const nOrographicLiftRh = relativeHumidity(current.absoluteHumidity, nt - nTempChange)
                if (nOrographicLiftRh > 1) {
                  const nDiff = Math.min(current.absoluteHumidity, (nOrographicLiftRh - 1) * current.absoluteHumidity) / wf / 10
                  current.moisture += nDiff * 100
                  current.absoluteHumidity -= nDiff
                }
              }
            }
          }

          if (crh > 1) {
            const diff = (crh - 1) * current.absoluteHumidity / wf
            current.moisture += diff * 100
            current.absoluteHumidity -= diff
          }

          if (current.featureType === 'Ocean' && next.featureType !== 'Ocean') {
            const diff = Math.min(current.absoluteHumidity, 2 * Math.random())
            next.moisture += diff * 100
            current.absoluteHumidity -= diff
          }

          const random = Math.random()
          if (current.featureType === 'Land' && random < 0.2 && current.absoluteHumidity > 0) {
            const diff = current.absoluteHumidity * random / wf
            current.moisture += diff * 100
            current.absoluteHumidity -= diff
          }

          next.absoluteHumidity = current.absoluteHumidity
          current.relativeHumidity = absoluteHumidtyToVaporPressure(current.absoluteHumidity, ct) / csvp

          visited1.add(current)
          current = next
          next = current.wind.target
        }
      }
    })

    smooth(polygons)

    const visited2 = new Set()
    sinks.forEach((s) => {
      if (s.featureType !== 'Ocean') {
        let current = s
        let next = current.wind.target

        let averageAbsoluteHumidity = 0
        current.neighbors.forEach((n) => {
          if (next !== n) {
            averageAbsoluteHumidity += n.absoluteHumidity
          }
        })
        averageAbsoluteHumidity /= current.neighbors.length
        current.absoluteHumidity = averageAbsoluteHumidity

        while (next !== undefined) {
          if (visited2.has(current) && visited2.has(next)) {
            break
          }

          if (current.featureType === 'Ocean') {
            current.moisture = 400
            current.relativeHumidity = 0.8
            const t = temperatureInCelsius(current.temperature)
            const saturationVaporPressure = buckEquation(t)
            const actualVaporPressure = current.relativeHumidity * saturationVaporPressure
            const absoluteHumidity = vaporPressureToAbsoluteHumidty(actualVaporPressure, t)
            current.absoluteHumidity = absoluteHumidity
          }

          const ce = elevationInMetersAsl(current.elevation)
          const ne = elevationInMetersAsl(next.elevation)

          const ct = temperatureInCelsius(current.temperature)
          const nt = temperatureInCelsius(next.temperature)

          const csvp = buckEquation(ct)

          const cavp = absoluteHumidtyToVaporPressure(current.absoluteHumidity, ct)

          const crh = cavp / csvp

          const wf = Math.max(2, current.wind.velocity)

          const er = evaporationRate(ct, current.pressure, current.solarInsolation, current.wind.velocity, csvp, cavp)

          const possibleEr = Math.min(current.moisture, er)

          current.moisture = Math.max(0, current.moisture - possibleEr)
          current.absoluteHumidity += possibleEr / 100

          if (ne > ce) {
            const tempChange = (ne - ce) ** 1 / 1000 * 0.03
            const orographicLiftRh = relativeHumidity(current.absoluteHumidity, ct - tempChange)
            if (orographicLiftRh > 1) {
              const diff = Math.min(current.absoluteHumidity, (orographicLiftRh - 1) * current.absoluteHumidity) / wf
              current.moisture += diff * 100
              current.absoluteHumidity -= diff
            }

            if (next.target !== undefined && next.target.elevation > ne) {
              const nTempChange = (next.target.elevation - ne) ** 1 / 1000 * 0.03
              const nOrographicLiftRh = relativeHumidity(current.absoluteHumidity, nt - nTempChange)
              if (nOrographicLiftRh > 1) {
                const nDiff = Math.min(current.absoluteHumidity, (nOrographicLiftRh - 1) * current.absoluteHumidity) / wf / 10
                current.moisture += nDiff * 100
                current.absoluteHumidity -= nDiff
              }
            }
          }

          if (crh > 1) {
            const diff = (crh - 1) * current.absoluteHumidity / wf
            current.moisture += diff * 100
            current.absoluteHumidity -= diff
          }

          if (current.featureType === 'Ocean' && next.featureType !== 'Ocean') {
            const diff = Math.min(current.absoluteHumidity, 2 * Math.random())
            next.moisture += diff * 100
            current.absoluteHumidity -= diff
          }

          const random = Math.random()
          if (current.featureType === 'Land' && random < 0.2 && current.absoluteHumidity > 0) {
            const diff = current.absoluteHumidity * random / wf
            current.moisture += diff * 100
            current.absoluteHumidity -= diff
          }

          next.absoluteHumidity = current.absoluteHumidity

          current.relativeHumidity = absoluteHumidtyToVaporPressure(current.absoluteHumidity, ct) / csvp

          visited2.add(current)
          current = next
          next = current.wind.target
        }
      }
    })

    smooth(polygons)
  }
}

/*
function propagate2 (diagram, polygons) {
  let sinks = new Set()
  polygons.map(function (p) {
    sinks.add(p)
  })

  polygons.map(function (p) {
    sinks.delete(p.wind.target)
  })

  for (let i = 0; i < 1; i++) {
    let visited1 = new Set()
    sinks.forEach(s => {
      if (s.featureType === 'Ocean') {
        s.moisture = 1

        let current = s
        let next = current.wind.target
        while (next !== undefined) {
          if (visited1.has(current) && visited1.has(next)) {
            break
          }

          let elevationDelta = Math.pow(Math.abs(next.elevation - current.elevation) * 2, 1)

          let delta = elevationDelta

          current.moisture = Math.min(Math.max(0, current.moisture - delta), 1)
          next.moisture = Math.min(Math.max(0, next.moisture + current.moisture), 1)

          if (current.featureType === 'Ocean') {
            current.moisture = 1
          }

          visited1.add(current)
          current = next
          next = current.wind.target
        }
      }
    })

    let visited2 = new Set()
    sinks.forEach(s => {
      if (s.featureType !== 'Ocean') {
        let current = s
        let next = current.wind.target

        let averageMoisture = 0
        current.neighbors.forEach(function (n) {
          if (next !== n) {
            averageMoisture += n.moisture
          }
        })
        averageMoisture /= (current.neighbors.length)
        current.moisture = averageMoisture

        while (next !== undefined) {
          if (visited2.has(current) && visited2.has(next)) {
            break
          }

          let elevationDelta = Math.pow(Math.abs(next.elevation - current.elevation) * 2, 2)

          let delta = elevationDelta

          current.moisture = Math.min(Math.max(0, current.moisture - delta), 1)
          next.moisture = Math.min(Math.max(0, next.moisture + current.moisture), 1)

          if (current.featureType === 'Ocean') {
            current.moisture = 1
          }

          visited2.add(current)
          current = next
          next = current.wind.target
        }
      }
    })

    if (i === 0) {
      smooth(polygons)
    }

    polygons.map(function (p) {
      if (p.featureType !== 'Ocean') {
        p.moisture = Math.max(0, p.moisture - 0.2)
      }
    })
  }

  polygons.map(function (p) {
    if (p.moisture === 0) {
      p.moisture = Math.random() * 0.1
    }
  })

  smooth(polygons)
}
*/

/*
function smooth2 (polygons) {
  polygons.map(function (p) {
    let averageMoisture = p.moisture
    p.neighbors.forEach(function (n) {
      averageMoisture += n.moisture
    })
    averageMoisture /= (p.neighbors.length + 1)
    p.moisture = averageMoisture
  })
}
*/

export default function setMoisture(terrain) {
  baseline(terrain.polygons)
  propagate(terrain.diagram, terrain.polygons)
}
