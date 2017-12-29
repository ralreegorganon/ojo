import { mapParameters } from 'parameters'
import { octavation } from 'terrain/noise'
import { elevationInMetersAsl } from 'terrain/conversion'

function baseline (polygons) {
  polygons.map(function (p) {
    p.temperature = 0.5
    p.radientTemperature = 0
    p.elevationTemperature = 0

    let latitude = ((1 - p.data[1]) / mapParameters.height) * 180 + 90

    let annual = 0
    for (let d = 1; d <= 365; d++) {
      let daily = 0
      for (let h = 0; h < 24; h++) {
        daily += Math.max(solarInsolation(latitude, d, h), 0)
      }
      annual += daily
    }

    annual /= 365

    p.solarInsolation = annual
  })
}

function declination (day) {
  return 23.45 * Math.sin((Math.PI * 360 / 365 / 180) * (day + 284))
}

function hourAngle (hour) {
  return 360 / 24 * (hour - 12)
}

function zenith (latitude, day, hour) {
  let l = latitude * Math.PI / 180
  let d = declination(day) * Math.PI / 180
  let h = hourAngle(hour) * Math.PI / 180
  let z = Math.acos(Math.sin(l) * Math.sin(d) + Math.cos(l) * Math.cos(d) * Math.cos(h))

  return z
}

function solarInsolation (latitude, day, hour) {
  let s = 1.3608 // kW/m^2
  let z = zenith(latitude, day, hour)
  let i = s * Math.cos(z)

  return i
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

    p.radientTemperature = p.temperature
  })
}

function elevation (polygons) {
  polygons.map(function (p) {
    if (p.elevation > mapParameters.seaLevel) {
      let metersAboveSeaLevel = elevationInMetersAsl(p.elevation)
      // let tempDecreaseDueToAltitude = metersAboveSeaLevel / 500 * 0.098
      let tempDecreaseDueToAltitude = metersAboveSeaLevel / 1000 * 0.03

      p.temperature -= tempDecreaseDueToAltitude
      p.elevationTemperature = tempDecreaseDueToAltitude
    }
  })
}

function smooth (polygons) {
  polygons.map(function (p) {
    let averageTemperature = p.temperature
    let averageRadientTemperature = p.radientTemperature
    let averageElevationTemperature = p.elevationTemperature
    p.neighbors.forEach(function (n) {
      averageTemperature += n.temperature
      averageRadientTemperature += n.radientTemperature
      averageElevationTemperature += n.elevationTemperature
    })
    averageTemperature /= (p.neighbors.length + 1)
    averageRadientTemperature /= (p.neighbors.length + 1)
    averageElevationTemperature /= (p.neighbors.length + 1)
    p.temperature = averageTemperature
    p.radientTemperature = averageRadientTemperature
    p.elevationTemperature = averageElevationTemperature
  })
}

function normalize (polygons) {
  let min = Math.min(...polygons.map(p => p.temperature))
  let max = Math.max(...polygons.map(p => p.temperature))

  polygons.map(function (p) {
    p.temperature = (p.temperature - min) / (max - min)
    p.radientTemperature = (p.radientTemperature - min) / (max - min)
    p.elevationTemperature = (p.elevationTemperature - min) / (max - min)
  })
}

export function setTemperatures (terrain) {
  baseline(terrain.polygons)
  solarRadiation(terrain.polygons)
  smooth(terrain.polygons)
  elevation(terrain.polygons)
  // normalize(terrain.polygons)
}
