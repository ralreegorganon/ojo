import * as d3 from 'd3'
import { interpolateBlues } from 'd3-scale-chromatic'

const colorPressure = d3.scaleSequential(interpolateBlues)

export default function drawPressure(g, polygons) {
  const pressureGroup = g.append('g').attr('id', 'pressure')
  polygons.forEach((p) => {
    pressureGroup
      .append('path')
      .attr('d', `M${p.join('L')}Z`)
      .attr('fill', colorPressure(p.pressure / 101.325))
  })
}
