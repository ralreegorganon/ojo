import { Vector } from 'vector2d'
import mapParameters from 'parameters'
import { elevationInMetersAsl } from 'terrain/conversion'
import { bounds, distanceFromPointToSegment } from 'utility/math'

function baseline(polygons) {
  polygons.forEach((p) => {
    p.wind = { force: new Vector(0, 0), target: undefined, velocity: 0 }
  })
}

function windProfilePowerLaw(sourceHeight, targetHeight, sourceWindSpeed) {
  if (sourceHeight === 0 || targetHeight === 0) {
    sourceHeight += 0.01
    targetHeight += 0.01
  }

  return sourceWindSpeed * (targetHeight / sourceHeight) ** 0.143
}

function windForceScalar(from, to) {
  const fromSpeed = from.wind.force.magnitude()
  const fromElevation = elevationInMetersAsl(from.elevation)
  const toElevation = elevationInMetersAsl(to.elevation)

  const elevationVariation = windProfilePowerLaw(fromElevation, toElevation, fromSpeed)

  const friction = to.featureType === 'Ocean' ? 1 : 0.6

  return elevationVariation * friction
}

function getMapEdgeSet(diagram, polygons) {
  const mapEdges = new Set()
  for (let i = 0; i < mapParameters.height; i++) {
    const left = polygons[diagram.find(0, i).index]
    const right = polygons[diagram.find(mapParameters.width, i).index]

    if (!mapEdges.has(left)) {
      mapEdges.add(left)
    }
    if (!mapEdges.has(right)) {
      mapEdges.add(right)
    }
  }
  for (let i = 0; i < mapParameters.width; i++) {
    const top = polygons[diagram.find(i, 0).index]
    const bottom = polygons[diagram.find(i, mapParameters.height).index]

    if (!mapEdges.has(top)) {
      mapEdges.add(top)
    }
    if (!mapEdges.has(bottom)) {
      mapEdges.add(bottom)
    }
  }
  return mapEdges
}

function getOceanSet(polygons) {
  return new Set(polygons.filter(f => f.featureType === 'Ocean'))
}

function getAllSet(polygons) {
  return new Set(polygons)
}

function pickSourceSet(diagram, polygons) {
  switch (mapParameters.wind.sourceSet) {
    case 'mapEdge':
      return getMapEdgeSet(diagram, polygons)
    case 'ocean':
      return getOceanSet(polygons)
    case 'all':
      return getAllSet(polygons)
    default:
      return getAllSet(polygons)
  }
}

function getForwardEdges(diagram, polygons, p, cell) {
  const forceUnit = p.wind.force.clone().unit()

  const forwardEdges = []

  cell.halfedges.forEach((e) => {
    const edge = diagram.edges[e]
    const edgeVectors = cell.edgeVectors.get(e)

    let other
    if (edge.left === undefined) {
      const rp = polygons[edge.right.index]
      other = rp === p ? undefined : rp
    } else if (edge.right === undefined) {
      const lp = polygons[edge.left.index]
      other = lp === p ? undefined : lp
    } else {
      const lp = polygons[edge.left.index]
      const rp = polygons[edge.right.index]
      other = lp === p ? rp : lp
    }

    const cross = Math.abs(forceUnit.cross(edgeVectors.edgeVector))

    if (other !== undefined && cross > 0) {
      const ep = edgeVectors.centerVector.clone().add(forceUnit)
      const forceDistance = distanceFromPointToSegment(ep.getX(), ep.getY(), edge[0][0], edge[0][1], edge[1][0], edge[1][1], true)

      if (forceDistance < edgeVectors.centerToEdgeDistance) {
        forwardEdges.push({ polygon: other, direction: edgeVectors.centerToEdgeVector })
      }
    }
  })

  return forwardEdges
}

function updateForceFromIncoming(polygons, incoming, windConstants, consider) {
  polygons.forEach((p) => {
    const force = new Vector(0, 0)

    const inc = incoming.get(p)

    if (inc.length > 0) {
      const max = Math.max(...inc.map(z => z.magnitude()))

      inc.forEach((f) => {
        force.add(f)
      })

      let wc
      if (p.latitude > windConstants.northernPolarEasterlies.startLatitude && p.latitude <= windConstants.northernPolarEasterlies.endLatitude) {
        wc = windConstants.northernPolarEasterlies
      } else if (p.latitude > windConstants.northernWesterlies.startLatitude && p.latitude <= windConstants.northernWesterlies.endLatitude) {
        wc = windConstants.northernWesterlies
      } else if (p.latitude > windConstants.northernTradeWinds.startLatitude && p.latitude <= windConstants.northernTradeWinds.endLatitude) {
        wc = windConstants.northernTradeWinds
      } else if (p.latitude > windConstants.southernTradeWinds.startLatitude && p.latitude <= windConstants.southernTradeWinds.endLatitude) {
        wc = windConstants.southernTradeWinds
      } else if (p.latitude > windConstants.southernWesterlies.startLatitude && p.latitude <= windConstants.southernWesterlies.endLatitude) {
        wc = windConstants.southernWesterlies
      } else if (p.latitude >= windConstants.southernPolarEasterlies.startLatitude && p.latitude <= windConstants.southernPolarEasterlies.endLatitude) {
        wc = windConstants.southernPolarEasterlies
      }

      force.add(wc.vectorScaled)

      const newForce = force.normalize().multiplyByScalar(max)

      p.wind.force = newForce

      if (!consider.has(p)) {
        consider.add(p)
      }
    }
  })
}

function buildWindFromConstant(wc) {
  const rads = (wc.angle * Math.PI) / 180
  const vector = new Vector(0, 0)
    .subtract(new Vector(-Math.sin(rads), Math.cos(rads)))
    .unit()
    .multiplyByScalar(wc.velocity)
  const vectorScaled = vector
    .clone()
    .unit()
    .multiplyByScalar(wc.velocity * wc.influence)

  return {
    startLatitude: wc.startLatitude,
    endLatitude: wc.endLatitude,
    vector,
    vectorScaled
  }
}

function globalWindConstants() {
  return {
    northernPolarEasterlies: buildWindFromConstant(mapParameters.wind.northernPolarEasterlies),
    northernWesterlies: buildWindFromConstant(mapParameters.wind.northernWesterlies),
    northernTradeWinds: buildWindFromConstant(mapParameters.wind.northernTradeWinds),
    southernTradeWinds: buildWindFromConstant(mapParameters.wind.southernTradeWinds),
    southernWesterlies: buildWindFromConstant(mapParameters.wind.southernWesterlies),
    southernPolarEasterlies: buildWindFromConstant(mapParameters.wind.southernPolarEasterlies)
  }
}

function flow(diagram, polygons) {
  const mapEdges = pickSourceSet(diagram, polygons)
  const windConstants = globalWindConstants()

  const consider = new Set(mapEdges)

  for (let i = 0; i < mapParameters.wind.maxIterations; i++) {
    const incoming = new Map()

    polygons.forEach((p) => {
      incoming.set(p, [])
    })

    mapEdges.forEach((p) => {
      let wc
      if (p.latitude > windConstants.northernPolarEasterlies.startLatitude && p.latitude <= windConstants.northernPolarEasterlies.endLatitude) {
        wc = windConstants.northernPolarEasterlies
      } else if (p.latitude > windConstants.northernWesterlies.startLatitude && p.latitude <= windConstants.northernWesterlies.endLatitude) {
        wc = windConstants.northernWesterlies
      } else if (p.latitude > windConstants.northernTradeWinds.startLatitude && p.latitude <= windConstants.northernTradeWinds.endLatitude) {
        wc = windConstants.northernTradeWinds
      } else if (p.latitude > windConstants.southernTradeWinds.startLatitude && p.latitude <= windConstants.southernTradeWinds.endLatitude) {
        wc = windConstants.southernTradeWinds
      } else if (p.latitude > windConstants.southernWesterlies.startLatitude && p.latitude <= windConstants.southernWesterlies.endLatitude) {
        wc = windConstants.southernWesterlies
      } else if (p.latitude >= windConstants.southernPolarEasterlies.startLatitude && p.latitude <= windConstants.southernPolarEasterlies.endLatitude) {
        wc = windConstants.southernPolarEasterlies
      }

      p.wind.force = wc.vector.clone()
      incoming.get(p).push(wc.vector.clone())
    })

    consider.forEach((p) => {
      const cell = diagram.cells[p.id]

      const forwardEdges = getForwardEdges(diagram, polygons, p, cell)

      forwardEdges.forEach((fe) => {
        let scalar = windForceScalar(p, fe.polygon)

        scalar += (fe.polygon.temperature - p.temperature) * 4

        const force = fe.direction.clone().multiplyByScalar(scalar)
        incoming.get(fe.polygon).push(force)
      })
    })

    updateForceFromIncoming(polygons, incoming, windConstants, consider)

    const magnitudes = polygons.map(p => p.wind.force.magnitude())
    const { min } = bounds(magnitudes, p => p)

    if (min > 0) {
      break
    }
  }
}

function setTarget(diagram, polygons) {
  for (let i = 0; i < polygons.length; i++) {
    const p = polygons[i]
    p.wind.velocity = p.wind.force.magnitude()
    const forceUnit = p.wind.force.clone().unit()

    let crossMax = 0
    let to = p

    const cell = diagram.cells[i]
    cell.halfedges.forEach((e) => {
      const edge = diagram.edges[e]
      const edgeVectors = cell.edgeVectors.get(e)

      const cross = Math.abs(forceUnit.cross(edgeVectors.edgeVector))

      let other
      if (edge.left === undefined) {
        const rp = polygons[edge.right.index]
        other = rp === p ? undefined : rp
      } else if (edge.right === undefined) {
        const lp = polygons[edge.left.index]
        other = lp === p ? undefined : lp
      } else {
        const lp = polygons[edge.left.index]
        const rp = polygons[edge.right.index]
        other = lp === p ? rp : lp
      }

      const ep = edgeVectors.centerVector.clone().add(forceUnit)
      const forceDistance = distanceFromPointToSegment(ep.getX(), ep.getY(), edge[0][0], edge[0][1], edge[1][0], edge[1][1], true)

      if (cross > crossMax && forceDistance < edgeVectors.centerToEdgeDistance) {
        to = other
        crossMax = cross
      }
    })

    if (to !== p) {
      p.wind.target = to
    }
  }
}

function propagate(diagram, polygons) {
  console.time('blah')
  flow(
    diagram,
    polygons
  )
  console.timeEnd('blah')
  setTarget(diagram, polygons)
}

function precalculateCellVectors(diagram, polygons) {
  polygons.forEach((p, i) => {
    const cell = diagram.cells[i]
    cell.edgeVectors = new Map()

    cell.halfedges.forEach((e) => {
      const edge = diagram.edges[e]

      const edgeVector = new Vector(edge[0][0], edge[0][1]).subtract(new Vector(edge[1][0], edge[1][1]))
      edgeVector.unit()

      const centerVector = new Vector(p.data[0], p.data[1])
      const centerToEdgeDistance = distanceFromPointToSegment(centerVector.getX(), centerVector.getY(), edge[0][0], edge[0][1], edge[1][0], edge[1][1], true)

      const centerToEdgeVector = new Vector((edge[0][0] + edge[1][0]) / 2, (edge[0][1] + edge[1][1]) / 2).subtract(new Vector(p.data[0], p.data[1])).unit()

      cell.edgeVectors.set(e, {
        edgeVector,
        centerVector,
        centerToEdgeDistance,
        centerToEdgeVector
      })
    })
  })
}

export default function setWind(terrain) {
  precalculateCellVectors(terrain.diagram, terrain.polygons)
  baseline(terrain.polygons)
  propagate(terrain.diagram, terrain.polygons)
}
