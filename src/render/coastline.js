import * as d3 from 'd3'

export default function drawCoastline(g, polygons, diagram) {
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

  const line = d3
    .line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(d3.curveLinear)
  // .curve(d3.curveBasisClosed)

  const coastlineGroup = g.append('g').attr('id', 'coastline')
  featureOutline.forEach((p) => {
    coastlineGroup
      .append('path')
      .attr('d', line(p))
      .attr('stroke', 'black')
      .attr('stroke-width', '0.5')
      .attr('stroke-linejoin', 'round')
      .attr('fill', 'none')
    // .attr('fill', '#FCECC8')
  })
}
