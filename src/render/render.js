import * as d3 from 'd3'
import { interpolateSpectral, interpolateBlues } from 'd3-scale-chromatic'
import d3Tip from 'd3-tip'
import mapParameters from 'parameters'
import { ObjectVector } from 'vector2d'
import { elevationInMetersAsl, temperatureInCelsius } from 'terrain/conversion'

const colorLinearOcean = d3
  .scaleLinear(d3.interpolateHcl)
  .domain([0, mapParameters.seaLevel])
  .range([
    '#71ABD8', // -10000m dark blue
    '#D8F2FE' //     0m light-blue
  ])

const colorLinearLand = d3
  .scaleLinear(d3.interpolateHcl)
  .domain([mapParameters.seaLevel, 0.4, 0.7, 0.95]) // 0.2, 0.4, 0.7, 0.95
  .range([
    '#94BF8B', //     1m green
    '#EFEBC0', //   300m yellow
    '#AA8753', //  3000m brown
    '#FFFFFF'
  ]) // ~6000m white

const colorGrayscaleElevation = d3
  .scaleLinear(d3.interpolateHcl)
  .domain([0, 1])
  .range(['#000', '#FFFFFF'])

const colorTemperature = d3.scaleSequential(interpolateSpectral)

const colorTemperatureBands = d3
  .scaleQuantile(d3.interpolateHcl)
  .domain([0.4, 0.5, 0.6, 0.7, 0.8])
  .range(['#0087a5', '#449270', '#005c74', '#8fb042'])

const colorPressure = d3.scaleSequential(interpolateBlues)

const colorMoisture = d3
  .scaleLinear(d3.interpolateHcl)
  .domain([0, 1])
  .range(['#EFEBC0', '#94BF8B'])

function colorFeatureType(i) {
  switch (i.featureType) {
    case 'Ocean':
      return '#71ABD8'
    case 'Land':
      return '#94BF8B'
    case 'Lake':
      return '#D8F2FE'
    default:
      return 'white'
  }
}

function colorBiome(biomeName) {
  switch (biomeName) {
    case 'polar desert':
      return '#fcfcfc'

    case 'subpolar dry tundra':
      return '#808080'
    case 'subpolar moist tundra':
      return '#608080'
    case 'subpolar wet tundra':
      return '#408090'
    case 'subpolar rain tundra':
      return '#2080C0'

    case 'boreal desert':
      return '#A0A080'
    case 'boreal dry scrub':
      return '#80A080'
    case 'boreal moist forest':
      return '#60A080'
    case 'boreal wet forest':
      return '#40A090'
    case 'boreal rain forest':
      return '#20A0C0'

    case 'cool temperate desert':
      return '#C0C080'
    case 'cool temperate desert scrub':
      return '#A0C080'
    case 'cool temperate steppe':
      return '#80C080'
    case 'cool temperate moist forest':
      return '#60C080'
    case 'cool temperate wet forest':
      return '#40C090'
    case 'cool temperate rain forest':
      return '#20C0C0'

    case 'warm temperate desert':
      return '#E0E080'
    case 'warm temperate desert scrub':
      return '#C0E080'
    case 'warm temperate thorn scrub':
      return '#A0E080'
    case 'warm temperate dry forest':
      return '#80E080'
    case 'warm temperate moist forest':
      return '#60E080'
    case 'warm temperate wet forest':
      return '#40E090'
    case 'warm temperate rain forest':
      return '#20E0C0'

    case 'subtropical desert':
      return '#E0E080'
    case 'subtropical desert scrub':
      return '#C0E080'
    case 'subtropical thorn woodland':
      return '#A0E080'
    case 'subtropical dry forest':
      return '#80E080'
    case 'subtropical moist forest':
      return '#60E080'
    case 'subtropical wet forest':
      return '#40E090'
    case 'subtropical rain forest':
      return '#20E0C0'

    case 'tropical desert':
      return '#FFFF80'
    case 'tropical desert scrub':
      return '#E0FF80'
    case 'tropical thorn woodland':
      return '#C0FF80'
    case 'tropical very dry forest':
      return '#A0FF80'
    case 'tropical dry forest':
      return '#80FF80'
    case 'tropical moist forest':
      return '#60FF80'
    case 'tropical wet forest':
      return '#40FF90'
    case 'tropical rain forest':
      return '#20FFA0'
    default:
      return '#000'
  }
}

function drawTriangles(g, triangles) {
  triangles.forEach((i, d) => {
    g
      .append('path')
      .attr('d', `M${i.join('L')}Z`)
      .attr('id', d)
      .attr('stroke', 'black')
      .attr('fill', 'none')
      .attr('stroke-width', '0.7')
  })
}

function elevationFillColor(polygon) {
  let { elevation } = polygon

  if (mapParameters.render.elevation.useStepInsteadOfElevation) {
    elevation = polygon.step
  }

  switch (mapParameters.render.elevation.color) {
    case 'greyscale':
      return colorGrayscaleElevation(elevation)
    case 'greyscaleNoWater':
      if (elevation < mapParameters.seaLevel) {
        return colorGrayscaleElevation(mapParameters.seaLevel)
      }
      return colorGrayscaleElevation(elevation)

    case 'featureType':
      return colorFeatureType(polygon)
    case 'colorized':
      if (elevation < mapParameters.seaLevel) {
        return colorLinearOcean(elevation)
      }
      return colorLinearLand(elevation)

    default:
      return 1
  }
}

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

function drawElevation(g, polygons) {
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

  polygons.forEach((i, d) => {
    g.attr('fill', 'white')
    g
      .append('path')
      .attr('d', `M${i.join('L')}Z`)
      .attr('id', d)
      .attr('fill', elevationFillColor(i))
  })
  if (mapParameters.render.elevation.drawDownhill) {
    polygons.forEach((i, d) => {
      if (i.downhill.target !== undefined) {
        const data = [{ x: i.data[0], y: i.data[1] }, { x: i.downhill.target.data[0], y: i.downhill.target.data[1] }]
        g
          .append('path')
          .attr('d', path(data))
          .attr('stroke', 'red')
          .attr('stroke-width', '0.2')
          .attr('stroke-linejoin', 'round')
          .attr('marker-start', 'url(#marker_stub)')
          .attr('marker-end', 'url(#marker_arrow)')
      }
    })
  }
}

function drawTemperature(g, polygons) {
  polygons.forEach((i, d) => {
    g
      .append('path')
      .attr('d', `M${i.join('L')}Z`)
      .attr('id', d)
      .attr('fill-opacity', mapParameters.render.temperature.opacity)
      .attr('fill', temperatureFillColor(i))
  })
}

function drawPressure(g, polygons) {
  polygons.forEach((i, d) => {
    g
      .append('path')
      .attr('d', `M${i.join('L')}Z`)
      .attr('id', d)
      .attr('fill', colorPressure(i.pressure / 101.325))
  })
}

function drawMoisture(g, polygons) {
  const maxAbsoluteHumidity = Math.max(...polygons.map(p => p.absoluteHumidity))

  polygons.forEach((i, d) => {
    let colorValue = 0
    let textValue = 0

    switch (mapParameters.render.moisture.type) {
      case 'absoluteHumidity':
        colorValue = i.absoluteHumidity / maxAbsoluteHumidity
        textValue = i.absoluteHumidity / 30
        break
      case 'relativeHumidity':
        colorValue = i.relativeHumidity
        textValue = i.absoluteHumidity * 100
        break
      case 'moisture':
        colorValue = i.moisture / 400
        textValue = i.moisture
        break
      default:
        colorValue = 0
        textValue = 0
    }

    g
      .append('path')
      .attr('d', `M${i.join('L')}Z`)
      .attr('id', d)
      .attr('fill', colorTemperature(colorValue))
      .attr('fill-opacity', '1')

    if (mapParameters.render.moisture.drawAmount) {
      g
        .append('text')
        .attr('x', i.data[0])
        .attr('y', i.data[1])
        .attr('font-size', '2px')
        .text(textValue.toFixed(0))
    }
  })
}

function drawBiomes(g, polygons) {
  polygons.forEach((i, d) => {
    if (i.featureType === 'Land') {
      g
        .append('path')
        .attr('d', `M${i.join('L')}Z`)
        .attr('id', d)
        .attr('fill', colorBiome(i.biome.name))
    } else {
      g
        .append('path')
        .attr('d', `M${i.join('L')}Z`)
        .attr('id', d)
        .attr('fill', elevationFillColor(i))
    }
  })
}

function drawRivers(g, polygons) {
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

  polygons.forEach((i, d) => {
    if (i.isRiver) {
      const data = [{ x: i.data[0], y: i.data[1] }, { x: i.downhill.target.data[0], y: i.downhill.target.data[1] }]
      g
        .append('path')
        .attr('d', path(data))
        .attr('stroke', 'blue')
        .attr('stroke-width', 0.5)
        .attr('stroke-linejoin', 'round')
    }
  })
}

function drawPlates(g, polygons) {
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

  polygons.forEach((p) => {
    g
      .append('path')
      .attr('d', `M${p.join('L')}Z`)
      .attr('stroke', 'white')
      .attr('stroke-width', '1')
      .attr('stroke-linejoin', 'round')
      .attr('fill', 'none')

    if (mapParameters.render.plates.drawForce && p.force !== undefined) {
      const c = ObjectVector(p.data[0], p.data[1])
      const ep = c.clone().add(p.force.clone())
      const data = [{ x: c.getX(), y: c.getY() }, { x: ep.getX(), y: ep.getY() }]

      g
        .append('path')
        .attr('d', path(data))
        .attr('stroke', 'red')
        .attr('stroke-width', '1')
        .attr('stroke-linejoin', 'round')
        .attr('fill', 'none')
        .attr('marker-start', 'url(#marker_square)')
        .attr('marker-end', 'url(#marker_arrow)')
    }
  })
}

function drawWind(g, polygons) {
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

  polygons.forEach((p) => {
    if (mapParameters.render.wind.drawWindNetwork) {
      if (p.wind.target !== undefined) {
        const data = [{ x: p.data[0], y: p.data[1] }, { x: p.wind.target.data[0], y: p.wind.target.data[1] }]
        g
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

      const c = ObjectVector(p.data[0], p.data[1])
      const scalar = p.wind.velocity < 2 ? 0.5 : 1 / Math.log(p.wind.velocity) * 0.5
      const ep = c.clone().add(p.wind.force.clone().multiplyByScalar(scalar * 3))
      const data = [{ x: c.getX(), y: c.getY() }, { x: ep.getX(), y: ep.getY() }]

      g
        .append('path')
        .attr('d', path(data))
        .attr('stroke', 'red')
        .attr('stroke-width', '0.5')
        .attr('stroke-linejoin', 'round')
        .attr('marker-start', 'url(#marker_stub)')
        .attr('marker-end', 'url(#marker_arrow)')
    }

    if (mapParameters.render.wind.drawWindVelocity) {
      g
        .append('text')
        .attr('x', p.data[0])
        .attr('y', p.data[1])
        .attr('font-size', '2px')
        .text(p.wind.velocity.toFixed(1))
    }
  })
}

function drawCoastline(g, polygons, diagram) {
  const features = new Map()

  polygons.forEach((p) => {
    if (p.featureType !== 'Land') {
      return
    }
    if (!features.has(p.featureIndex)) {
      features.set(p.featureIndex, [])
    }
    features.get(p.featureIndex).push(p)
  })

  const featureOutline = new Map()

  features.forEach((featurePolygons, featureIndex) => {
    const featureEdges = new Map()
    featurePolygons.forEach((p) => {
      const cell = diagram.cells[p.id]
      cell.halfedges.forEach((e) => {
        const edge = diagram.edges[e]

        if (!featureEdges.has(edge)) {
          featureEdges.set(edge, 0)
        }

        featureEdges.set(edge, featureEdges.get(edge) + 1)
      })
    })

    const outerEdges = []
    featureEdges.forEach((count, edge) => {
      if (count === 1) {
        outerEdges.push(edge)
      }
    })

    const outerEdgePoints = []
    while (outerEdges.length > 0) {
      const start = outerEdges[0][0]
      let end = outerEdges[0][1]
      outerEdges.shift()
      outerEdgePoints.push(start)
      outerEdgePoints.push(end)

      while (end[0] !== start[0] && end[1] !== start[1]) {
        const next = outerEdges.filter(e => (e[0][0] === end[0] && e[0][1] === end[1]) || (e[1][0] === end[0] && e[1][1] === end[1]))
        if (next.length > 0) {
          const n = next[0]
          if (n[0][0] === end[0] && n[0][1] === end[1]) {
            end = n[1]
          } else if (n[1][0] === end[0] && n[1][1] === end[1]) {
            end = n[0]
          }
          outerEdgePoints.push(end)
        }
        const rem = outerEdges.indexOf(next[0])
        outerEdges.splice(rem, 1)
      }
    }

    featureOutline.set(featureIndex, outerEdgePoints)
  })

  const line = d3.line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(d3.curveLinear)
    // .curve(d3.curveBasisClosed)

  featureOutline.forEach((points, index) => {
    g.append('path')
      .attr('d', line(points))
      .attr('stroke', 'black')
      .attr('stroke-width', '0.5')
      .attr('stroke-linejoin', 'round')
      .attr('fill', 'none')
      // .attr('fill', '#FCECC8')
  })
}

function markers(defs) {
  const data = [
    {
      id: 0,
      name: 'circle',
      path: 'M 0, 0  m -5, 0  a 5,5 0 1,0 10,0  a 5,5 0 1,0 -10,0',
      viewbox: '-6 -6 12 12'
    },
    {
      id: 1,
      name: 'square',
      path: 'M 0,0 m -5,-5 L 5,-5 L 5,5 L -5,5 Z',
      viewbox: '-5 -5 10 10'
    },
    {
      id: 2,
      name: 'arrow',
      path: 'M 0,0 m -5,-5 L 5,0 L -5,5 Z',
      viewbox: '-5 -5 10 10'
    },
    {
      id: 2,
      name: 'stub',
      path: 'M 0,0 m -1,-5 L 1,-5 L 1,5 L -1,5 Z',
      viewbox: '-1 -5 2 10'
    }
  ]

  defs
    .selectAll('marker')
    .data(data)
    .enter()
    .append('marker')
    .attr('id', d => `marker_${d.name}`)
    .attr('markerHeight', 5)
    .attr('markerWidth', 5)
    .attr('markerUnits', 'strokeWidth')
    .attr('orient', 'auto')
    .attr('refX', 0)
    .attr('refY', 0)
    .attr('viewBox', d => d.viewbox)
    .append('svg:path')
    .attr('d', d => d.path)
    .attr('fill', 'red')
}

const tip = d3Tip()
  .attr('class', 'd3-tip')
  .html((d) => {
    const elevation = elevationInMetersAsl(d.elevation).toFixed(0)
    const temperature = temperatureInCelsius(d.temperature).toFixed(1)
    const temperaturef = Math.round(temperature * 1.8 + 32)
    const pressure = d.pressure.toFixed(3)
    const windSpeed = d.wind.velocity.toFixed(3)
    const moisture = d.moisture.toFixed(3)
    const absoluteHumidity = d.absoluteHumidity.toFixed(3)
    const relativeHumidity = (d.relativeHumidity * 100).toFixed(0)
    const downhillSlope = d.downhill.slope.toFixed(2)
    const downhillFlux = d.downhill.flux.toFixed(2)

    return `
    <table>
      <tr><td>id</td><td>${d.id}</td></tr>
      <tr><td>e (m)</td><td>${elevation}</td></tr>
      <tr><td>t (c)</td><td>${temperature}</td></tr>
      <tr><td>t (f)</td><td>${temperaturef}</td></tr>
      <tr><td>p (kPa)</td><td>${pressure}</td></tr>
      <tr><td>ws (m/s)</td><td>${windSpeed}</td></tr>
      <tr><td>m (cm)</td><td>${moisture}</td></tr>
      <tr><td>ah (g/m^3)</td><td>${absoluteHumidity}</td></tr>
      <tr><td>rh (%)</td><td>${relativeHumidity}</td></tr>
      <tr><td>biome</td><td>${d.biome.name}</td></tr>
      <tr><td>downhill slope</td><td>${downhillSlope}</td></tr>
      <tr><td>downhill flux</td><td>${downhillFlux}</td></tr>
    </table>
    `
  })

function drawTooltips(g, polygons) {
  polygons.forEach((i, d) => {
    g
      .append('path')
      .attr('d', `M${i.join('L')}Z`)
      .attr('id', d)
      .attr('pointer-events', 'all')
      .attr('fill', 'none')
      .on('mouseover', d => tip.show(i))
      .on('mouseout', d => tip.hide())
  })
}

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

  if (mapParameters.render.drawCoastline) {
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
    .call(d3.zoom().on('zoom', () => {
      g.attr('transform', d3.event.transform)
    }))

  svg
    .append('text')
    .attr('x', '0')
    .attr('y', mapParameters.height - 10)
    .attr('dy', '.35em')
    .text(mapParameters.annotation)

  svg.call(tip)
}
