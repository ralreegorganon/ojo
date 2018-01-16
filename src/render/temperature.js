import * as d3 from 'd3'
import { interpolateSpectral } from 'd3-scale-chromatic'
import mapParameters from 'parameters'

const colorTemperature = d3.scaleSequential(interpolateSpectral)

const colorTemperatureBands = d3
  .scaleQuantile(d3.interpolateHcl)
  .domain([0.4, 0.5, 0.6, 0.7, 0.8])
  .range(['#0087a5', '#449270', '#005c74', '#8fb042'])

function temperatureFillColor(polygon) {
  switch (mapParameters.render.temperature.color) {
    case 'bands':
      return colorTemperatureBands(1 - polygon.temperature)
    case 'linear':
      return colorTemperature(1 - polygon.temperature)
    default:
      return 1
  }
}

export default function drawTemperature(g, polygons) {
  const temperatureGroup = g.append('g').attr('id', 'temperature')
  polygons.forEach((p) => {
    temperatureGroup
      .append('path')
      .attr('d', `M${p.join('L')}Z`)
      .attr('fill-opacity', mapParameters.render.temperature.opacity)
      .attr('fill', temperatureFillColor(p))
  })
}
