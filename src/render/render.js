import * as d3 from 'd3'
import { mapParameters } from 'parameters'

let colorLinearOcean = d3.scaleLinear(d3.interpolateHcl)
  .domain([0, mapParameters.seaLevel])
  .range([
    '#71ABD8', // -10000m dark blue
    '#D8F2FE' //     0m light-blue
  ])

let colorLinearLand = d3.scaleLinear(d3.interpolateHcl)
  .domain([mapParameters.seaLevel, 0.4, 0.7, 0.95]) // 0.2, 0.4, 0.7, 0.95
  .range([
    '#94BF8B', //     1m green
    '#EFEBC0', //   300m yellow
    '#AA8753', //  3000m brown
    '#FFFFFF']) // ~6000m white

let colorGrayscaleElevation = d3.scaleLinear(d3.interpolateHcl)
  .domain([0, 1])
  .range([
    '#000',
    '#FFFFFF'])

function colorFeatureType (i) {
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

function drawTriangles (g, triangles) {
  triangles.map(function (i, d) {
    g.append('path')
      .attr('d', 'M' + i.join('L') + 'Z')
      .attr('id', d)
      .attr('stroke', 'black')
      .attr('fill', 'none')
      // .attr('fill', color(i.elevation))
      // .attr('fill', color2(i.elevation))
      .attr('stroke-width', '0.7')
  })
}

function polygonFillColor (polygon) {
  let elevation = polygon.elevation

  if (mapParameters.render.polygon.useStepInsteadOfElevation) {
    elevation = polygon.step
  }

  switch (mapParameters.render.polygon.color) {
    case 'greyscale':
      return colorGrayscaleElevation(elevation)
    case 'featureType':
      return colorFeatureType(polygon)
    case 'colorized':
      return elevation < mapParameters.seaLevel ? colorLinearOcean(elevation) : colorLinearLand(elevation)
    default:
      return 1
  }
}

function drawPolygons (g, polygons) {
  polygons.map(function (i, d) {
    g.attr('fill', 'white')
    g.append('path')
      .attr('d', 'M' + i.join('L') + 'Z')
      .attr('id', d)
      .attr('fill', polygonFillColor(i))
  })
}

function drawCoastline (g, polygons, diagram) {
  let line = []
  for (let i = 0; i < polygons.length; i++) {
    if (polygons[i].elevation >= mapParameters.seaLevel) {
      let cell = diagram.cells[i]
      cell.halfedges.forEach(function (e) {
        let edge = diagram.edges[e]
        if (edge.left && edge.right) {
          let ea = edge.left.index
          if (ea === i) {
            ea = edge.right.index
          }
          if (polygons[ea].elevation < mapParameters.seaLevel) {
            // store edge start and end point separately
            let start = edge[0].join(' ')
            let end = edge[1].join(' ')
            // store Island number for a ocean coast
            let type
            let number
            if (polygons[ea].featureType === 'Ocean') {
              type = 'Land'
              number = polygons[i].featureIndex
            } else {
              type = 'Lake'
              number = polygons[ea].featureIndex
            }
            // push Data to array
            line.push({ start, end, type, number })
          }
        }
      })
    }
  }

  let x = d3.scaleLinear().domain([0, mapParameters.width]).range([0, mapParameters.width])
  let y = d3.scaleLinear().domain([0, mapParameters.height]).range([0, mapParameters.height])
  let path = d3.line()
    .x(function (d) {
      return x(d.x)
    })
    .y(function (d) {
      return y(d.y)
    })
  // .curve(d3.curveBasisClosed)

  {
    let number = 0
    let edgesOfFeature = line.filter(l => l.number === number && l.type === 'Land')
    while (edgesOfFeature.length > 0) {
      let coast = [] // array to store coastline for feature
      let start = edgesOfFeature[0].start // start point of first element
      let end = edgesOfFeature[0].end // end point of first element
      edgesOfFeature.shift()
      let spl = start.split(' ') // get array from string
      coast.push({ x: spl[0], y: spl[1] }) // push start to coastline
      spl = end.split(' ')
      coast.push({ x: spl[0], y: spl[1] }) // push end to coastline
      // use for instead of while to avoid eternal loop
      for (let i = 0; end !== start && i < 2000; i++) {
        let next = edgesOfFeature.filter(e => e.start === end || e.end === end)
        if (next.length > 0) {
          if (next[0].start === end) {
            end = next[0].end
          } else if (next[0].end === end) {
            end = next[0].start
          }
          spl = end.split(' ')
          coast.push({ x: spl[0], y: spl[1] })
        }
        let rem = edgesOfFeature.indexOf(next[0])
        edgesOfFeature.splice(rem, 1)
      }

      g.append('path').attr('d', path(coast))
        .attr('stroke', 'black')
        .attr('stroke-width', '1')
        .attr('stroke-linejoin', 'round')
        .attr('fill', 'none')

      number += 1
      edgesOfFeature = line.filter(l => l.number === number && l.type === 'Land')
    }
  }

  {
    let number = 0
    let edgesOfFeature = line.filter(l => l.number === number && l.type === 'Lake')
    while (edgesOfFeature.length > 0) {
      let coast = [] // array to store coastline for feature
      let start = edgesOfFeature[0].start // start point of first element
      let end = edgesOfFeature[0].end // end point of first element
      edgesOfFeature.shift()
      let spl = start.split(' ') // get array from string
      coast.push({ x: spl[0], y: spl[1] }) // push start to coastline
      spl = end.split(' ')
      coast.push({ x: spl[0], y: spl[1] }) // push end to coastline
      // use for instead of while to avoid eternal loop
      for (let i = 0; end !== start && i < 2000; i++) {
        let next = edgesOfFeature.filter(e => e.start === end || e.end === end)
        if (next.length > 0) {
          if (next[0].start === end) {
            end = next[0].end
          } else if (next[0].end === end) {
            end = next[0].start
          }
          spl = end.split(' ')
          coast.push({ x: spl[0], y: spl[1] })
        }
        let rem = edgesOfFeature.indexOf(next[0])
        edgesOfFeature.splice(rem, 1)
      }

      g.append('path').attr('d', path(coast))
        .attr('stroke', 'black')
        .attr('stroke-width', '1')
        .attr('stroke-linejoin', 'round')
        .attr('fill', 'none')

      number += 1
      edgesOfFeature = line.filter(l => l.number === number && l.type === 'Lake')
    }
  }
}

export function draw (world) {
  let svg = d3.select('svg')
  let g = svg.append('g')
  svg.attr('width', mapParameters.width)
  svg.attr('height', mapParameters.height)
  svg.attr('shape-rendering', mapParameters.render.shapeRendering)

  drawPolygons(g, world.terrain.polygons)

  if (mapParameters.render.drawCoastline) {
    drawCoastline(g, world.terrain.polygons, world.terrain.diagram)
  }

  if (mapParameters.render.drawTriangles) {
    drawTriangles(g, world.terrain.triangles)
  }

  svg.append('rect')
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .attr('width', mapParameters.width)
    .attr('height', mapParameters.height)
    .call(d3.zoom()
      .on('zoom', zoom))

  function zoom () {
    g.attr('transform', d3.event.transform)
  }
}
