import { ObjectVector } from 'vector2d'
import { mapParameters } from 'parameters'
import { octavation } from 'terrain/noise'
import { bounds } from 'utility/math'

function elevationOctavation (x, y) {
  return octavation(x, y, mapParameters.elevation.octavation.iterations, mapParameters.elevation.octavation.frequency,
    mapParameters.elevation.octavation.persistence, mapParameters.elevation.octavation.lacunarity,
    mapParameters.elevation.octavation.standardRatio, mapParameters.elevation.octavation.billowedRatio,
    mapParameters.elevation.octavation.ridgedRatio)
}

function islandMask (x, y) {
  let width = mapParameters.width
  let height = mapParameters.height

  let dx = Math.abs(x - width * 0.5)
  let dy = Math.abs(y - height * 0.5)
  let d = Math.max(dx, dy)

  let mw = width * 0.55 - mapParameters.elevation.islandMask.margin
  let delta = d / mw
  let g = delta * delta

  return g
}

function normalize (polygons) {
  let minMax = bounds(polygons, p => p.elevation)
  let min = minMax.min
  let max = minMax.max

  polygons.map(function (p) {
    p.elevation = (p.elevation - min) / (max - min)
  })
}

function sculpt (polygons, exponent) {
  polygons.map(function (p) {
    p.elevation = Math.pow(p.elevation, exponent)
  })
}

function step (polygons) {
  polygons.map(function (p) {
    p.step = mapParameters.elevation.islandMask.apply ? islandMask(p.data[0], p.data[1]) : 0
    p.elevation *= Math.max(0, 1 - p.step)
  })
}

function octavate (polygons) {
  polygons.map(function (p) {
    p.elevation += elevationOctavation(p.data[0], p.data[1])
  })
}

function baseline (polygons) {
  polygons.map(function (p) {
    p.elevation = 0.0
  })
}

function smooth (polygons) {
  polygons.map(function (p) {
    let averageElevation = p.elevation
    p.neighbors.forEach(function (n) {
      averageElevation += n.elevation
    })
    averageElevation /= (p.neighbors.length + 1)
    p.elevation = averageElevation
  })
}

function plateTectonicify (polygons, plates) {
  plates.polygons.map(function (p) {
    let force = ObjectVector(0.5 - Math.random(), 0.5 - Math.random())
    force.normalize().multiplyByScalar(Math.random() * 100)
    p.force = force
  })

  for (let i = 0; i < plates.polygons.length; i++) {
    let cell = plates.diagram.cells[i]
    cell.halfedges.forEach(function (e) {
      let edge = plates.diagram.edges[e]
      edge.plateBoundary = { stress: 0, parallel: 0, orthogonal: 0, divergent: false }
      if (edge.left && edge.right) {
        let edgeVector = ObjectVector(edge[0][0], edge[0][1]).subtract(ObjectVector(edge[1][0], edge[1][1]))
        edgeVector.normalize()

        let lp = plates.polygons[edge.left.index]
        let rp = plates.polygons[edge.right.index]

        let leftMotion = lp.force
        let rightMotion = rp.force

        let stress = leftMotion.clone().subtract(rightMotion)
        let magnitude = stress.magnitude()
        let parallel = Math.abs(stress.clone().dot(edgeVector))
        let orthogonal = Math.abs(stress.clone().cross(edgeVector))

        let direction = ObjectVector(rp.data[0], rp.data[1]).subtract(ObjectVector(lp.data[0], lp.data[1]))

        let directionality = direction.clone().unit().dot(rightMotion.clone().unit())

        let divergent = !(directionality < 0)

        edge.plateBoundary = { stress, parallel, orthogonal, divergent, magnitude }
      }
    })
  }

  polygons.map(function (p) {
    for (let i = 0; i < plates.polygons.length; i++) {
      let cell = plates.diagram.cells[i]
      cell.halfedges.forEach(function (e) {
        let edge = plates.diagram.edges[e]
        if (edge.left && edge.right) {
          let d = distanceFromPointToSegment(p.data[0], p.data[1], edge[0][0], edge[0][1], edge[1][0], edge[1][1], true)

          if (d < edge.plateBoundary.orthogonal) {
            let normalized = d / edge.plateBoundary.orthogonal
            let amount = 0.1 * Math.pow((1.0 - normalized * normalized), 2)

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

function distanceFromPointToSegment (x, y, x0, y0, x1, y1, segment) {
  var d = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)
  var t = ((x - x0) * (x1 - x0) + (y - y0) * (y1 - y0)) / d

  if (segment && t < 0) {
    return Math.sqrt((x - x0) * (x - x0) + (y - y0) * (y - y0))
  }

  if (segment && t > 1) {
    return Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1))
  }

  var xp = x0 + t * (x1 - x0)
  var yp = y0 + t * (y1 - y0)
  return Math.sqrt((x - xp) * (x - xp) + (y - yp) * (y - yp))
}

export function setElevations (terrain, plates) {
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
