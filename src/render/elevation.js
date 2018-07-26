import * as d3 from 'd3'
import mapParameters from 'parameters'

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

export default function drawElevation(g, polygons) {
  const elevationGroup = g.append('g').attr('id', 'elevation')

  polygons.forEach((p) => {
    elevationGroup
      .append('path')
      .attr('d', `M${p.join('L')}Z`)
      .attr('fill', elevationFillColor(p))
  })
  if (mapParameters.render.elevation.drawDownhill) {
    const path = d3
      .line()
      .x(d => d.x)
      .y(d => d.y)

    const downhillGroup = g.append('g').attr('id', 'downhill')

    polygons.forEach((p) => {
      if (p.downhill.target === undefined) {
        downhillGroup
          .append('path')
          .attr('d', `M${p.join('L')}Z`)
          .attr('stroke', 'green')
          .attr('stroke-width', '1')
      }
    })

    polygons.forEach((p) => {
      if (p.downhill.target !== undefined) {
        const data = [{ x: p.data[0], y: p.data[1] }, { x: p.downhill.target.data[0], y: p.downhill.target.data[1] }]
        downhillGroup
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
