import { ObjectVector } from 'vector2d'
import { mapParameters } from 'parameters'
import { elevationInMetersAsl } from 'terrain/conversion'
import { bounds, distanceFromPointToSegment } from 'utility/math'

function baseline(polygons) {
  polygons.forEach((p) => {
    p.wind = { force: ObjectVector(0, 0), target: undefined, velocity: 0 }
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

function propagate(diagram, polygons) {
  const rads = mapParameters.wind.tradeWindAngle * Math.PI / 180
  const trade = ObjectVector(0, 0)
    .subtract(ObjectVector(-Math.sin(rads), Math.cos(rads)))
    .unit()
    .multiplyByScalar(mapParameters.wind.tradeWindVelocity)

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

  for (let i = 0; i < 500; i++) {
    const incoming = new Map()
    polygons.forEach((p) => {
      incoming.set(p, [])
    })

    mapEdges.forEach((p) => {
      p.wind.force = trade.clone()
      incoming.get(p).push(trade.clone())
    })

    /* */
    // console.time("complex")
    for (let j = 0; j < polygons.length; j++) {
      const p = polygons[j]

      const forwardEdges = []
      const cell = diagram.cells[j]
      cell.halfedges.forEach((e) => {
        const edge = diagram.edges[e]
        const edgeVector = ObjectVector(edge[0][0], edge[0][1]).subtract(ObjectVector(edge[1][0], edge[1][1]))
        edgeVector.normalize()

        const cross = Math.abs(p.wind.force
          .clone()
          .unit()
          .cross(edgeVector.clone().unit()))

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

        const c = ObjectVector(p.data[0], p.data[1])
        const ep = c.clone().add(p.wind.force.clone().unit())

        const centerDistance = distanceFromPointToSegment(c.getX(), c.getY(), edge[0][0], edge[0][1], edge[1][0], edge[1][1], true)
        const forceDistance = distanceFromPointToSegment(ep.getX(), ep.getY(), edge[0][0], edge[0][1], edge[1][0], edge[1][1], true)

        if (cross > 0 && forceDistance < centerDistance && other !== undefined) {
          const direction = ObjectVector((edge[0][0] + edge[1][0]) / 2, (edge[0][1] + edge[1][1]) / 2)
            .subtract(ObjectVector(p.data[0], p.data[1]))
            .unit()
          forwardEdges.push({ polygon: other, direction })
        }
      })

      forwardEdges.forEach((fe) => {
        let scalar = windForceScalar(p, fe.polygon)

        scalar += (fe.polygon.temperature - p.temperature) * 4

        const force = fe.direction.clone().multiplyByScalar(scalar)
        incoming.get(fe.polygon).push(force)
      })
    }
    // console.timeEnd("complex")

    /**/

    /* good but not quite since fuckery with dots
    console.time("simple")
    polygons.map(function (p) {
      let forwardEdges = []
      p.neighbors.forEach(function (n) {
        let direction = ObjectVector(n.data[0], n.data[1]).subtract(ObjectVector(p.data[0], p.data[1])).unit()
        let dot = direction.dot(p.wind.force.clone().unit())
        if (dot > 0) {
          forwardEdges.push({polygon: n, direction, dot})
        }
      })

      let m = p.wind.force.magnitude()

      forwardEdges.map(function (fe) {
        let forces = incoming.get(fe.polygon)
        let scalar = m

        let delta = Math.max(fe.polygon.elevation, mapParameters.seaLevel) - Math.max(p.elevation, mapParameters.seaLevel)

        scalar *= Math.pow((1 - delta), 4)

        let force = fe.direction.clone().multiplyByScalar(scalar)
        forces.push(force)
      })
    })
    console.timeEnd("simple")
    */

    polygons.forEach((p) => {
      const force = ObjectVector(0, 0)

      const inc = incoming.get(p)

      if (inc.length > 0) {
        const max = Math.max(...inc.map(z => z.magnitude()))

        inc.forEach((f) => {
          force.add(f)
        })

        force.add(trade
          .clone()
          .unit()
          .multiplyByScalar(mapParameters.wind.tradeWindVelocity * mapParameters.wind.tradeWindInfluence))

        const newForce = force.normalize().multiplyByScalar(max)
        // let newForce = trade.clone()

        p.wind.force = newForce
      }
    })

    const magnitudes = polygons.map(p => p.wind.force.magnitude())
    const { min } = bounds(magnitudes, p => p)

    if (min > 0) {
      break
    }
  }

  for (let i = 0; i < polygons.length; i++) {
    const p = polygons[i]
    p.wind.velocity = p.wind.force.magnitude()

    let crossMax = 0
    let to = p

    const cell = diagram.cells[i]
    cell.halfedges.forEach((e) => {
      const edge = diagram.edges[e]
      const edgeVector = ObjectVector(edge[0][0], edge[0][1]).subtract(ObjectVector(edge[1][0], edge[1][1]))
      edgeVector.normalize()

      const cross = Math.abs(p.wind.force
        .clone()
        .unit()
        .cross(edgeVector.clone().unit()))

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

      const c = ObjectVector(p.data[0], p.data[1])
      const ep = c.clone().add(p.wind.force.clone().unit())

      const centerDistance = distanceFromPointToSegment(c.getX(), c.getY(), edge[0][0], edge[0][1], edge[1][0], edge[1][1], true)
      const forceDistance = distanceFromPointToSegment(ep.getX(), ep.getY(), edge[0][0], edge[0][1], edge[1][0], edge[1][1], true)

      if (cross > crossMax && forceDistance < centerDistance) {
        to = other
        crossMax = cross
      }
    })

    if (to !== p) {
      p.wind.target = to
    }
  }

  /*
  polygons.map(function (p) {
    p.wind.velocity = p.wind.force.magnitude()

    let dotMax = 0
    let to = p
    p.neighbors.forEach(function (n) {
      let direction = ObjectVector(n.data[0], n.data[1]).subtract(ObjectVector(p.data[0], p.data[1])).unit()
      let dot = direction.dot(p.wind.force.clone().unit())
      if (dot > dotMax) {
        to = n
      }
    })

    if (to !== p) {
      p.wind.target = to
    }
  })
  */
}

export default function setWind(terrain) {
  baseline(terrain.polygons)
  propagate(terrain.diagram, terrain.polygons)
}
