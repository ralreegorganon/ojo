import { mapParameters } from 'parameters'
import { octavation } from 'terrain/noise'

function baseline (polygons) {
  polygons.map(function (p) {
    p.temperature = 0.5
  })
}

function solarRadiation (polygons) {
  polygons.map(function (p) {
    let y = (p.data[1] / mapParameters.height)
    let noise = octavation(p.data[0], p.data[1], 10, 2, 0.7, 2, 1, 0, 0) * 0.05
    let spike = 1 - Math.abs(Math.cos(Math.PI * y + noise))
    let gentle = Math.pow((1 - Math.cos(2 * Math.PI * y + noise)) / 2, 0.1) - 0.2

    if (y > 0.435 && y < 0.565) {
      p.temperature = spike
    } else {
      p.temperature = gentle
    }

    p.temperature += 0.03 * octavation(p.data[0], p.data[1], 10, 3, 0.9, 5, 0.5, 0.5, 0)

    // p.temperature = Math.pow((1 - Math.cos(2 * Math.PI * y + noise)) / 2, 0.3)
    // p.temperature += 0.03 * octavation(p.data[0], p.data[1], 10, 2, 0.5, 5, 0.5, 0.5, 0)

    // p.temperature = 1 - Math.abs(Math.cos(Math.PI * y + noise))
    // p.temperature += 0.03 * octavation(p.data[0], p.data[1], 10, 2, 0.5, 5, 0.5, 0.5, 0)
    // p.temperature = Math.pow(p.temperature, 0.2)

    // let t = 1 - Math.abs(Math.cos(Math.PI * y + noise))
    // p.temperature = (Math.pow(t, 5) + 6 * Math.pow(t, 0.3)) / 7

    // p.temperature = Math.pow(p.temperature, 0.8)
  })
}

function elevationToMeters (e) {
  return Math.pow(e, 4) * 9000
}

function temperatureToCelsius (t) {
  return t * 100 - 50
}

function elevation (polygons) {
  polygons.map(function (p) {
    if (p.elevation > mapParameters.seaLevel) {
      let metersAboveSeaLevel = elevationToMeters(p.elevation - mapParameters.seaLevel)
      let tempDecreaseDueToAltitude = metersAboveSeaLevel / 500 * 0.098

      p.temperature -= tempDecreaseDueToAltitude

      // p.temperature -= Math.pow(p.elevation, 2) * (p.elevation - mapParameters.seaLevel)
      // p.temperature = Math.max(0, Math.min(1, p.temperature))
    }
  })
}

function smooth (polygons) {
  polygons.map(function (p) {
    let averageTemperature = p.temperature
    p.neighbors.forEach(function (n) {
      averageTemperature += n.temperature
    })
    averageTemperature /= (p.neighbors.length + 1)
    p.temperature = averageTemperature
  })
}

function normalize (polygons) {
  let min = Math.min(...polygons.map(p => p.temperature))
  let max = Math.max(...polygons.map(p => p.temperature))

  polygons.map(function (p) {
    p.temperature = (p.temperature - min) / (max - min)
  })
}

export function setTemperatures (terrain) {
  baseline(terrain.polygons)
  solarRadiation(terrain.polygons)
  smooth(terrain.polygons)
  elevation(terrain.polygons)
  normalize(terrain.polygons)
}
