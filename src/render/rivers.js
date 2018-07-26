import * as d3 from 'd3'
import mapParameters from 'parameters'

export default function drawRivers(g, polygons) {
  const x = d3
    .scaleLinear()
    .domain([0, mapParameters.width])
    .range([0, mapParameters.width])
  const y = d3
    .scaleLinear()
    .domain([0, mapParameters.height])
    .range([0, mapParameters.height])
  const path = d3
    .line()
    .x(d => x(d.x))
    .y(d => y(d.y))

  const riverGroup = g.append('g').attr('id', 'rivers')

  polygons.forEach((p) => {
    if (p.isRiver) {
      const data = [{ x: p.data[0], y: p.data[1] }, { x: p.downhill.target.data[0], y: p.downhill.target.data[1] }]
      riverGroup
        .append('path')
        .attr('d', path(data))
        .attr('stroke', 'blue')
        .attr('stroke-width', 0.5)
        .attr('stroke-linejoin', 'round')

      riverGroup
        .append('text')
        .attr('x', (p.downhill.target.data[0] + p.data[0]) / 2)
        .attr('y', (p.downhill.target.data[1] + p.data[1]) / 2)
        .attr('font-size', '2px')
        .text(p.downhill.flux.toFixed(0))
    }
  })
}
