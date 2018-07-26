import * as d3 from 'd3'
import { Vector } from 'vector2d'
import mapParameters from 'parameters'

export default function drawWind(g, polygons) {
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

  const windGroup = g.append('g').attr('id', 'wind')

  polygons.forEach((p) => {
    if (mapParameters.render.wind.drawWindNetwork) {
      if (p.wind.target !== undefined) {
        const data = [{ x: p.data[0], y: p.data[1] }, { x: p.wind.target.data[0], y: p.wind.target.data[1] }]
        windGroup
          .append('path')
          .attr('d', path(data))
          .attr('stroke', 'red')
          .attr('stroke-width', '0.2')
          .attr('stroke-linejoin', 'round')
          .attr('marker-start', 'url(#marker_stub)')
          .attr('marker-end', 'url(#marker_arrow)')
      }
    }

    if (mapParameters.render.wind.drawWindVectors) {
      if (p.id % 2 === 0) {
        return
      }

      const c = new Vector(p.data[0], p.data[1])
      const scalar = p.wind.velocity < 2 ? 0.5 : (1 / Math.log(p.wind.velocity)) * 0.5
      const ep = c.clone().add(p.wind.force.clone().multiplyByScalar(scalar * 3))
      const data = [{ x: c.getX(), y: c.getY() }, { x: ep.getX(), y: ep.getY() }]

      windGroup
        .append('path')
        .attr('d', path(data))
        .attr('stroke', 'red')
        .attr('stroke-width', '0.5')
        .attr('stroke-linejoin', 'round')
        .attr('marker-start', 'url(#marker_stub)')
        .attr('marker-end', 'url(#marker_arrow)')
    }

    if (mapParameters.render.wind.drawWindVelocity) {
      windGroup
        .append('text')
        .attr('x', p.data[0])
        .attr('y', p.data[1])
        .attr('font-size', '2px')
        .text(p.wind.velocity.toFixed(1))
    }
  })
}
