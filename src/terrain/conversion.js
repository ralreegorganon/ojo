import { mapParameters } from 'parameters'

export function elevationInMetersAsl(e) {
  if (e <= mapParameters.seaLevel) {
    return 0
  }
  return (Math.max(e - mapParameters.seaLevel, 0) / (1 - mapParameters.seaLevel)) ** 2 * 8000
}

export function temperatureInCelsius(t) {
  return t * 100 - 50
}
