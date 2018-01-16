import * as d3 from 'd3'
import { interpolateSpectral } from 'd3-scale-chromatic'
import mapParameters from 'parameters'

const colorMoisture = d3.scaleSequential(interpolateSpectral)

export default function drawMoisture(g, polygons) {
  const maxAbsoluteHumidity = Math.max(...polygons.map(p => p.absoluteHumidity))

  const moistureGroup = g.append('g').attr('id', 'moisture')
  polygons.forEach((p) => {
    let colorValue = 0
    let textValue = 0

    switch (mapParameters.render.moisture.type) {
      case 'absoluteHumidity':
        colorValue = p.absoluteHumidity / maxAbsoluteHumidity
        textValue = p.absoluteHumidity / 30
        break
      case 'relativeHumidity':
        colorValue = p.relativeHumidity
        textValue = p.absoluteHumidity * 100
        break
      case 'moisture':
        colorValue = p.moisture / 400
        textValue = p.moisture
        break
      default:
        colorValue = 0
        textValue = 0
    }

    moistureGroup
      .append('path')
      .attr('d', `M${p.join('L')}Z`)
      .attr('fill', colorMoisture(colorValue))
      .attr('fill-opacity', '1')

    if (mapParameters.render.moisture.drawAmount) {
      moistureGroup
        .append('text')
        .attr('x', p.data[0])
        .attr('y', p.data[1])
        .attr('font-size', '2px')
        .text(textValue.toFixed(0))
    }
  })
}
