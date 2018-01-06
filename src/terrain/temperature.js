import { mapParameters } from 'parameters'
import octavation from 'terrain/noise'
import { elevationInMetersAsl } from 'terrain/conversion'
import { bounds } from 'utility/math'
import memoize from 'fast-memoize'

function declination(day) {
  return 23.45 * Math.sin(Math.PI * 360 / 365 / 180 * (day + 284))
}

const memoizedDeclination = memoize(declination)

function hourAngle(hour) {
  return 360 / 24 * (hour - 12)
}

const memoizedHourAngle = memoize(hourAngle)

function zenith(latitude, day, hour) {
  const l = latitude * Math.PI / 180
  const d = memoizedDeclination(day) * Math.PI / 180
  const h = memoizedHourAngle(hour) * Math.PI / 180
  const z = Math.acos(Math.sin(l) * Math.sin(d) + Math.cos(l) * Math.cos(d) * Math.cos(h))

  return z
}

function solarInsolation(latitude, day, hour) {
  const s = 1.3608 // kW/m^2
  const z = zenith(latitude, day, hour)
  const i = s * Math.cos(z)

  return i
}

function solarRadiation(polygons) {
  polygons.forEach((p) => {
    const y = p.data[1] / mapParameters.height
    const noise = octavation(p.data[0], p.data[1], 10, 2, 0.7, 2, 1, 0, 0) * 0.05
    const spike = 1 - Math.abs(Math.cos(Math.PI * y + noise))
    const gentle = ((1 - Math.cos(2 * Math.PI * y + noise)) / 2) ** 0.1 - 0.2

    if (y > 0.435 && y < 0.565) {
      p.temperature = spike
    } else {
      p.temperature = gentle
    }

    p.temperature += 0.03 * octavation(p.data[0], p.data[1], 10, 3, 0.9, 5, 0.5, 0.5, 0)

    p.radientTemperature = p.temperature
  })
}

function elevation(polygons) {
  polygons.forEach((p) => {
    if (p.elevation > mapParameters.seaLevel) {
      const metersAboveSeaLevel = elevationInMetersAsl(p.elevation)
      const tempDecreaseDueToAltitude = metersAboveSeaLevel / 1000 * 0.03

      p.temperature -= tempDecreaseDueToAltitude
      p.elevationTemperature = tempDecreaseDueToAltitude
    }
  })
}

function smooth(polygons) {
  polygons.forEach((p) => {
    let averageTemperature = p.temperature
    let averageRadientTemperature = p.radientTemperature
    let averageElevationTemperature = p.elevationTemperature
    p.neighbors.forEach((n) => {
      averageTemperature += n.temperature
      averageRadientTemperature += n.radientTemperature
      averageElevationTemperature += n.elevationTemperature
    })
    averageTemperature /= p.neighbors.length + 1
    averageRadientTemperature /= p.neighbors.length + 1
    averageElevationTemperature /= p.neighbors.length + 1
    p.temperature = averageTemperature
    p.radientTemperature = averageRadientTemperature
    p.elevationTemperature = averageElevationTemperature
  })
}

function normalize(polygons) {
  const { min, max } = bounds(polygons, p => p.temperature)

  polygons.forEach((p) => {
    p.temperature = (p.temperature - min) / (max - min)
    p.radientTemperature = (p.radientTemperature - min) / (max - min)
    p.elevationTemperature = (p.elevationTemperature - min) / (max - min)
  })
}

function baseline(polygons) {
  const averageAnnualSolarInsolation = new Map()
  for (let l = -90; l <= 90; l++) {
    let annual = 0
    for (let d = 1; d <= 365; d++) {
      let daily = 0
      for (let h = 0; h < 24; h++) {
        daily += Math.max(solarInsolation(l, d, h), 0)
      }
      annual += daily
    }
    annual /= 365
    averageAnnualSolarInsolation.set(l, annual)
  }

  polygons.forEach((p) => {
    p.temperature = 0
    p.radientTemperature = 0
    p.elevationTemperature = 0

    const latitude = Math.min(90, Math.max(0, Math.round(p.latitude)))
    p.solarInsolation = averageAnnualSolarInsolation.get(latitude)
  })
}

function globalModifier(polygons) {
  polygons.forEach((p) => {
    p.temperature = Math.max(Math.min(p.temperature + mapParameters.temperature.globalModifier, 1), 0)
  })
}

export default function setTemperatures(terrain) {
  baseline(terrain.polygons)
  solarRadiation(terrain.polygons)
  smooth(terrain.polygons)
  elevation(terrain.polygons)
  normalize(terrain.polygons)
  globalModifier(terrain.polygons)
}
