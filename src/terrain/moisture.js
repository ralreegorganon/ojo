import { mapParameters } from 'parameters'
import { elevationInMetersAsl, temperatureInCelsius } from 'terrain/conversion'

function baseline (polygons) {
  // absoluteHumidity

  polygons.map(function (p) {
    let t = temperatureInCelsius(p.temperature)
    let saturationVaporPressure = buckEquation(t)

    if (p.featureType === 'Ocean' || p.featureType === 'Lake') {
      p.moisture = 400
      // relative humidity over ocean is 0.8
      p.relativeHumidity = 0.8

      let actualVaporPressure = p.relativeHumidity * saturationVaporPressure
      let absoluteHumidity = vaporPressureToAbsoluteHumidty(actualVaporPressure, t)
      p.absoluteHumidity = absoluteHumidity
    } else {
      p.moisture = 0
      // let local sources provide 0.25
      p.relativeHumidity = 0
      // p.relativeHumidity = 0

      let actualVaporPressure = p.relativeHumidity * saturationVaporPressure
      let absoluteHumidity = vaporPressureToAbsoluteHumidty(actualVaporPressure, t)
      p.absoluteHumidity = absoluteHumidity
    }

    // p.moisture = 0.3 * (1 - Math.max(p.elevation, mapParameters.seaLevel))
  })
}

// pressure in kPa, temperature in C, returns density of water vapor in air (g/m^3)
function vaporPressureToAbsoluteHumidty (pressure, temperature) {
  let p = pressure * 1000
  let t = temperature + 273.15
  let d = 2.16679 * p / t
  return d
}

// density of water vapor in air (g/m^3), temperature in C, returns pressure in kPa
function absoluteHumidtyToVaporPressure (density, temperature) {
  let d = density
  let t = temperature + 273.15
  let p = d * t / 2.16679 / 1000
  return p
}

// temperature in C, returns vapor pressure in kPa
function buckEquationOverLiquidWater (temperature) {
  // https://en.wikipedia.org/wiki/Arden_Buck_equation
  let saturationVaporPressure = 0.61121 * Math.exp((18.678 - (temperature / 234.5)) * (temperature / (257.14 + temperature)))
  return saturationVaporPressure
}

// temperature in C, returns vapor pressure in kPa
function buckEquationOverIce (temperature) {
  // https://en.wikipedia.org/wiki/Arden_Buck_equation
  let saturationVaporPressure = 0.61115 * Math.exp((23.036 - (temperature / 333.7)) * (temperature / (279.82 + temperature)))
  return saturationVaporPressure
}

function buckEquation (temperature) {
  let saturationVaporPressure = temperature > 0 ? buckEquationOverLiquidWater(temperature) : buckEquationOverIce(temperature)
  return saturationVaporPressure
}

function buckEquationOverLiquidWaterDeriveTemperature (saturationVaporPressure) {
  let x = Math.ln(saturationVaporPressure / 0.61121)
  let t = (-4379.991 + 234.5 * x + Math.sqrt(54990.25 * Math.pow(x, 2) - 2295413.099 * x + 19184321.16008)) / -2
  return t
}

function relativeHumidity (absoluteHumidity, temperature) {
  let saturationVaporPressure = buckEquation(temperature)
  let actualVaporPressure = absoluteHumidtyToVaporPressure(absoluteHumidity, temperature)
  let relativeHumidity = actualVaporPressure / saturationVaporPressure
  return relativeHumidity
}

// mm / day
// http://edis.ifas.ufl.edu/pdffiles/ae/ae45900.pdf
function evaporationRate (temperature, pressure, solarInsolation, windSpeed, saturationVaporPressure, actualVaporPressure) {
  let g = 0.082
  let r = solarInsolation * 3.6
  let t = temperature
  let u2 = windSpeed
  let es = saturationVaporPressure
  let ea = actualVaporPressure
  let psychrometric = 0.000665 * pressure
  let slope = 4098 * (0.6108 * Math.exp((17.27 * t) / (t + 237.3))) / Math.pow((t + 237.3), 2)
  let er = (0.408 * slope * (r - g) + psychrometric * (900 / (t + 273)) * u2 * (es - ea)) / (slope + psychrometric * (1 + 0.34 * u2))
  return er
}

function propagate (diagram, polygons) {
  let sinks = new Set()
  polygons.map(function (p) {
    sinks.add(p)
  })

  polygons.map(function (p) {
    sinks.delete(p.wind.target)
  })

  for (let i = 0; i < mapParameters.moisture.iterations; i++) {
    let visited1 = new Set()
    sinks.forEach(s => {
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
            let t = temperatureInCelsius(current.temperature)
            let saturationVaporPressure = buckEquation(t)
            let actualVaporPressure = current.relativeHumidity * saturationVaporPressure
            let absoluteHumidity = vaporPressureToAbsoluteHumidty(actualVaporPressure, t)
            current.absoluteHumidity = absoluteHumidity
          }

          let cft = current.featureType
          let nft = next.featureType

          let cws = current.wind.velocity
          let nws = next.wind.velocity

          let deltaws = next.wind.velocity / current.wind.velocity

          let ce = elevationInMetersAsl(current.elevation)
          let ne = elevationInMetersAsl(next.elevation)

          let ct = temperatureInCelsius(current.temperature)
          let nt = temperatureInCelsius(next.temperature)

          let cah = current.absoluteHumidity
          let nah = next.absoluteHumidity

          let csvp = buckEquation(ct)
          let nsvp = buckEquation(nt)

          let cavp = absoluteHumidtyToVaporPressure(cah, ct)
          let navp = absoluteHumidtyToVaporPressure(nah, nt)

          let crh = cavp / csvp
          let nrh = navp / nsvp

          let cp = current.pressure
          let np = next.pressure

          let cr = current.solarInsolation
          let nr = next.solarInsolation

          let wf = Math.max(2, cws)

          let er = evaporationRate(ct, cp, cr, cws, csvp, cavp)

          let possibleEr = Math.min(current.moisture, er)

          current.moisture = Math.max(0, current.moisture - possibleEr)
          current.absoluteHumidity += possibleEr / 100

          if (ne > ce) {
            let tempChange = Math.pow((ne - ce), 1) / 1000 * 0.03
            let orographicLiftRh = relativeHumidity(current.absoluteHumidity, ct - tempChange)
            if (orographicLiftRh > 1) {
              let diff = Math.min(current.absoluteHumidity, (orographicLiftRh - 1) * current.absoluteHumidity) / wf
              current.moisture += diff * 100
              current.absoluteHumidity -= diff

              // console.log(`${current.id} dumping due to orographic lift: ${diff}   from: ${ce} to: ${ne} change: ${tempChange} ws: ${cws}`)
            
              if (next.target !== undefined && next.target.elevation > ne) {
                let tempChange = Math.pow((next.target.elevation - ne), 1) / 1000 * 0.03
                let orographicLiftRh = relativeHumidity(current.absoluteHumidity, nt - tempChange)
                if (orographicLiftRh > 1) {
                  let diff = Math.min(current.absoluteHumidity, (orographicLiftRh - 1) * current.absoluteHumidity) / wf / 10
                  current.moisture += diff * 100
                  current.absoluteHumidity -= diff
  
                // console.log(`${current.id} dumping due to orographic lift: ${diff}   from: ${ce} to: ${ne} change: ${tempChange} ws: ${cws}`)
                }
              }
            }
          }

          if (crh > 1) {
            let diff = (crh - 1) * current.absoluteHumidity / wf
            current.moisture += diff * 100
            current.absoluteHumidity -= diff
            // console.log(`${current.id} dumping due to 100% saturation: ${diff}`)
          }

          if (cft === 'Ocean' && nft !== 'Ocean') {
            let diff = Math.min(current.absoluteHumidity, 2 * Math.random())
            next.moisture += diff * 100
            current.absoluteHumidity -= diff
          }

          let random = Math.random()
          if (cft === 'Land' && random < 0.2 && current.absoluteHumidity > 0) {
            let diff = current.absoluteHumidity * random / wf
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

    let visited2 = new Set()
    sinks.forEach(s => {
      if (s.featureType !== 'Ocean') {
        let current = s
        let next = current.wind.target

        let averageAbsoluteHumidity = 0
        current.neighbors.forEach(function (n) {
          if (next !== n) {
            averageAbsoluteHumidity += n.absoluteHumidity
          }
        })
        averageAbsoluteHumidity /= (current.neighbors.length)
        current.absoluteHumidity = averageAbsoluteHumidity

        while (next !== undefined) {
          if (visited2.has(current) && visited2.has(next)) {
            break
          }

          if (current.featureType === 'Ocean') {
            current.moisture = 400
            current.relativeHumidity = 0.8
            let t = temperatureInCelsius(current.temperature)
            let saturationVaporPressure = buckEquation(t)
            let actualVaporPressure = current.relativeHumidity * saturationVaporPressure
            let absoluteHumidity = vaporPressureToAbsoluteHumidty(actualVaporPressure, t)
            current.absoluteHumidity = absoluteHumidity
          }

          let cft = current.featureType
          let nft = next.featureType

          let cws = current.wind.velocity
          let nws = next.wind.velocity

          let ce = elevationInMetersAsl(current.elevation)
          let ne = elevationInMetersAsl(next.elevation)

          let ct = temperatureInCelsius(current.temperature)
          let nt = temperatureInCelsius(next.temperature)

          let cah = current.absoluteHumidity
          let nah = next.absoluteHumidity

          let csvp = buckEquation(ct)
          let nsvp = buckEquation(nt)

          let cavp = absoluteHumidtyToVaporPressure(cah, ct)
          let navp = absoluteHumidtyToVaporPressure(nah, nt)

          let crh = cavp / csvp
          let nrh = navp / nsvp

          let cp = current.pressure
          let np = next.pressure

          let cr = current.solarInsolation
          let nr = next.solarInsolation

          let wf = Math.max(2, cws)

          let er = evaporationRate(ct, cp, cr, cws, csvp, cavp)

          let possibleEr = Math.min(current.moisture, er)

          current.moisture = Math.max(0, current.moisture - possibleEr)
          current.absoluteHumidity += possibleEr / 100

          if (ne > ce) {
            let tempChange = Math.pow((ne - ce), 1) / 1000 * 0.03
            let orographicLiftRh = relativeHumidity(current.absoluteHumidity, ct - tempChange)
            if (orographicLiftRh > 1) {
              let diff = Math.min(current.absoluteHumidity, (orographicLiftRh - 1) * current.absoluteHumidity) / wf
              current.moisture += diff * 100
              current.absoluteHumidity -= diff

              // console.log(`${current.id} dumping due to orographic lift: ${diff}   from: ${ce} to: ${ne} change: ${tempChange} ws: ${cws}`)
            }

            if (next.target !== undefined && next.target.elevation > ne) {
              let tempChange = Math.pow((next.target.elevation - ne), 1) / 1000 * 0.03
              let orographicLiftRh = relativeHumidity(current.absoluteHumidity, nt - tempChange)
              if (orographicLiftRh > 1) {
                let diff = Math.min(current.absoluteHumidity, (orographicLiftRh - 1) * current.absoluteHumidity) / wf / 10
                current.moisture += diff * 100
                current.absoluteHumidity -= diff

              // console.log(`${current.id} dumping due to orographic lift: ${diff}   from: ${ce} to: ${ne} change: ${tempChange} ws: ${cws}`)
              }
            }
          }

          if (crh > 1) {
            let diff = (crh - 1) * current.absoluteHumidity / wf
            current.moisture += diff * 100
            current.absoluteHumidity -= diff

            // console.log(`${current.id} dumping due to 100% saturation: ${diff}`)
          }

          if (cft === 'Ocean' && nft !== 'Ocean') {
            let diff = Math.min(current.absoluteHumidity, 2 * Math.random())
            next.moisture += diff * 100
            current.absoluteHumidity -= diff
          }

          let random = Math.random()
          if (cft === 'Land' && random < 0.2 && current.absoluteHumidity > 0) {
            let diff = current.absoluteHumidity * random / wf
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

function smooth (polygons) {
  polygons.map(function (p) {
    if (p.featureType === 'Ocean') {
      return
    }

    let averageMoisture = p.moisture
    let c = 1
    p.neighbors.forEach(function (n) {
      if (n.featureType !== 'Ocean') {
        averageMoisture += n.moisture
        c++
      }
    })
    averageMoisture /= c
    p.moisture = averageMoisture
  })
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

export function setMoisture (terrain) {
  baseline(terrain.polygons)
  propagate(terrain.diagram, terrain.polygons)
}
