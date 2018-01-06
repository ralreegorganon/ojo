import { ObjectVector } from 'vector2d'
import { mapParameters } from 'parameters'
import octavation from 'terrain/noise'
import { bounds, distanceFromPointToSegment } from 'utility/math'

function elevationOctavation(x, y) {
  return octavation(x, y, mapParameters.elevation.octavation.iterations, mapParameters.elevation.octavation.frequency, mapParameters.elevation.octavation.persistence, mapParameters.elevation.octavation.lacunarity, mapParameters.elevation.octavation.standardRatio, mapParameters.elevation.octavation.billowedRatio, mapParameters.elevation.octavation.ridgedRatio)
}

function islandMask(x, y) {
  const { width, height } = mapParameters

  const dx = Math.abs(x - width * 0.5)
  const dy = Math.abs(y - height * 0.5)
  const d = Math.max(dx, dy)

  const mw = width * 0.55 - mapParameters.elevation.islandMask.margin
  const delta = d / mw
  const g = delta * delta

  return g
}

function normalize(polygons) {
  const { min, max } = bounds(polygons, p => p.elevation)

  polygons.forEach((p) => {
    p.elevation = (p.elevation - min) / (max - min)
  })
}

function sculpt(polygons, exponent) {
  polygons.forEach((p) => {
    p.elevation **= exponent
  })
}

function step(polygons) {
  polygons.forEach((p) => {
    p.step = mapParameters.elevation.islandMask.apply ? islandMask(p.data[0], p.data[1]) : 0
    p.elevation *= Math.max(0, 1 - p.step)
  })
}

function octavate(polygons) {
  polygons.forEach((p) => {
    p.elevation += elevationOctavation(p.data[0], p.data[1])
  })
}

function baseline(polygons) {
  polygons.forEach((p) => {
    p.elevation = 0.0
  })
}

function smooth(polygons) {
  polygons.forEach((p) => {
    let averageElevation = p.elevation
    p.neighbors.forEach((n) => {
      averageElevation += n.elevation
    })
    averageElevation /= p.neighbors.length + 1
    p.elevation = averageElevation
  })
}

function plateTectonicify(polygons, plates) {
  plates.polygons.forEach((p) => {
    const force = ObjectVector(0.5 - Math.random(), 0.5 - Math.random())
    force.normalize().multiplyByScalar(Math.random() * 100)
    p.force = force
  })

  for (let i = 0; i < plates.polygons.length; i++) {
    const cell = plates.diagram.cells[i]
    cell.halfedges.forEach((e) => {
      const edge = plates.diagram.edges[e]
      edge.plateBoundary = {
        stress: 0,
        parallel: 0,
        orthogonal: 0,
        divergent: false
      }
      if (edge.left && edge.right) {
        const edgeVector = ObjectVector(edge[0][0], edge[0][1]).subtract(ObjectVector(edge[1][0], edge[1][1]))
        edgeVector.normalize()

        const lp = plates.polygons[edge.left.index]
        const rp = plates.polygons[edge.right.index]

        const leftMotion = lp.force
        const rightMotion = rp.force

        const stress = leftMotion.clone().subtract(rightMotion)
        const magnitude = stress.magnitude()
        const parallel = Math.abs(stress.clone().dot(edgeVector))
        const orthogonal = Math.abs(stress.clone().cross(edgeVector))

        const direction = ObjectVector(rp.data[0], rp.data[1]).subtract(ObjectVector(lp.data[0], lp.data[1]))

        const directionality = direction
          .clone()
          .unit()
          .dot(rightMotion.clone().unit())

        const divergent = !(directionality < 0)

        edge.plateBoundary = {
          stress,
          parallel,
          orthogonal,
          divergent,
          magnitude
        }
      }
    })
  }

  polygons.forEach((p) => {
    for (let i = 0; i < plates.polygons.length; i++) {
      const cell = plates.diagram.cells[i]
      cell.halfedges.forEach((e) => {
        const edge = plates.diagram.edges[e]
        if (edge.left && edge.right) {
          const d = distanceFromPointToSegment(p.data[0], p.data[1], edge[0][0], edge[0][1], edge[1][0], edge[1][1], true)

          if (d < edge.plateBoundary.orthogonal) {
            const normalized = d / edge.plateBoundary.orthogonal
            const amount = 0.1 * (1.0 - normalized * normalized) ** 2

            if (edge.plateBoundary.divergent) {
              p.elevation -= amount
            } else {
              p.elevation += amount
            }
          }
        }
      })
    }
  })

  smooth(polygons)
}

export default function setElevations(terrain, plates) {
  baseline(terrain.polygons)

  if (mapParameters.elevation.plates.apply) {
    plateTectonicify(terrain.polygons, plates)
  }

  if (mapParameters.elevation.octavation.apply) {
    octavate(terrain.polygons)
  }

  if (mapParameters.elevation.normalize.apply) {
    normalize(terrain.polygons)
  }

  if (mapParameters.elevation.sculpting.apply) {
    sculpt(terrain.polygons, mapParameters.elevation.sculpting.amount)
  }

  if (mapParameters.elevation.step.apply) {
    step(terrain.polygons)
  }
}
