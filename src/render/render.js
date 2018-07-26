import * as d3 from 'd3'
import mapParameters from 'parameters'
import drawBiomes from 'render/biome'
import drawElevation from 'render/elevation'
import drawTemperature from 'render/temperature'
import drawPressure from 'render/pressure'
import drawMoisture from 'render/moisture'
import drawWind from 'render/wind'
import drawRivers from 'render/rivers'
import drawCoastline from 'render/coastline'
import drawPlates from 'render/plates'
import markers from 'render/markers'
import drawTriangles from 'render/triangles'
import { drawTooltips, tip } from 'render/tooltips'

export default function draw(world) {
  const svg = d3.select('svg')
  svg.attr('width', mapParameters.width)
  svg.attr('height', mapParameters.height)
  svg.attr('shape-rendering', mapParameters.render.shapeRendering)

  const g = svg.append('g')

  const defs = svg.append('defs')
  markers(defs)

  if (mapParameters.render.elevation.draw) {
    drawElevation(g, world.terrain.polygons)
  }

  if (mapParameters.render.temperature.draw) {
    drawTemperature(g, world.terrain.polygons)
  }

  if (mapParameters.render.plates.draw) {
    drawPlates(g, world.terrain.plates.polygons)
  }

  if (mapParameters.render.pressure.draw) {
    drawPressure(g, world.terrain.polygons)
  }

  if (mapParameters.render.moisture.draw) {
    drawMoisture(g, world.terrain.polygons)
  }

  if (mapParameters.render.wind.draw) {
    drawWind(g, world.terrain.polygons)
  }

  if (mapParameters.render.biome.draw) {
    drawBiomes(g, world.terrain.polygons)
  }

  if (mapParameters.render.rivers.draw) {
    drawRivers(g, world.terrain.polygons)
  }

  if (mapParameters.render.coastline.draw) {
    drawCoastline(g, world.terrain.polygons, world.terrain.diagram)
  }

  if (mapParameters.render.drawTriangles) {
    drawTriangles(g, world.terrain.triangles)
  }

  drawTooltips(g, world.terrain.polygons)

  if (mapParameters.render.drawSeed) {
    svg
      .append('text')
      .attr('x', '0')
      .attr('y', '10')
      .attr('dy', '.35em')
      .text(mapParameters.seed)
  }

  svg
    .append('rect')
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .attr('width', mapParameters.width)
    .attr('height', mapParameters.height)
    .call(
      d3.zoom().on('zoom', () => {
        g.attr('transform', d3.event.transform)
      })
    )

  svg
    .append('text')
    .attr('x', '0')
    .attr('y', mapParameters.height - 10)
    .attr('dy', '.35em')
    .text(mapParameters.annotation)

  svg.call(tip)
}
