import { ObjectVector } from 'vector2d'
import { mapParameters } from 'parameters'
import { elevationInMetersAsl } from 'terrain/conversion'

function baseline (polygons) {
  polygons.map(function (p) {
    p.wind = { force: ObjectVector(0, 0), target: undefined, velocity: 0 }
  })
}

function logWindProfile (sourceHeight, targetHeight, sourceWindSpeed, zeroPlaneDisplacement, roughnessLength) {
  let target = Math.log((targetHeight - zeroPlaneDisplacement) / roughnessLength)
  let source = Math.log((sourceHeight - zeroPlaneDisplacement) / roughnessLength)
  return sourceWindSpeed * (target / source)
  /*
  Terrain description (m)
  Open sea, Fetch at least 5 km 0.0002
  Mud flats, snow; no vegetation, no obstacles 0.005
  Open flat terrain; grass, few isolated obstacles 0.03
  Low crops; occasional large obstacles, x/H > 20 0.10
  High crops; scattered obstacles, 15 < x/H < 20 0.25
  parkland, bushes; numerous obstacles, x/H ≈ 10 0.5
  Regular large obstacle coverage (suburb, forest) 1.0
  City centre with high- and low-rise buildings ≥ 2
  */
}

function windProfilePowerLaw (sourceHeight, targetHeight, sourceWindSpeed, exponent) {
  if (sourceHeight === 0 || targetHeight === 0) {
    sourceHeight += 0.01
    targetHeight += 0.01
  }

  return sourceWindSpeed * Math.pow(targetHeight / sourceHeight, 0.143)
}

function windForceScalar (from, to) {
  let fromSpeed = from.wind.force.magnitude()
  let fromElevation = elevationInMetersAsl(from.elevation)
  let toElevation = elevationInMetersAsl(to.elevation)

  let elevationVariation = windProfilePowerLaw(fromElevation, toElevation, fromSpeed)

  let friction = to.featureType === 'Ocean' ? 1 : 0.6

  return elevationVariation * friction
}

function propagate (diagram, polygons) {
  let rads = mapParameters.wind.tradeWindAngle * Math.PI / 180
  let trade = ObjectVector(0, 0).subtract(ObjectVector(-Math.sin(rads), Math.cos(rads))).unit().multiplyByScalar(mapParameters.wind.tradeWindVelocity)

  let mapEdges = new Set()
  for (let i = 0; i < mapParameters.height; i++) {
    let left = polygons[diagram.find(0, i).index]
    let right = polygons[diagram.find(mapParameters.width, i).index]

    if (!mapEdges.has(left)) {
      mapEdges.add(left)
    }
    if (!mapEdges.has(right)) {
      mapEdges.add(right)
    }
  }
  for (let i = 0; i < mapParameters.width; i++) {
    let top = polygons[diagram.find(i, 0).index]
    let bottom = polygons[diagram.find(i, mapParameters.height).index]

    if (!mapEdges.has(top)) {
      mapEdges.add(top)
    }
    if (!mapEdges.has(bottom)) {
      mapEdges.add(bottom)
    }
  }

  for (let i = 0; i < 500; i++) {
    let incoming = new Map()
    polygons.map(function (p) {
      incoming.set(p, [])
    })

    mapEdges.forEach(function (p) {
      p.wind.force = trade.clone()
      incoming.get(p).push(trade.clone())
    })

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

    /* */
    // console.time("complex")
    for (let i = 0; i < polygons.length; i++) {
      let p = polygons[i]

      let forwardEdges = []
      let cell = diagram.cells[i]
      cell.halfedges.forEach(function (e) {
        let edge = diagram.edges[e]
        let edgeVector = ObjectVector(edge[0][0], edge[0][1]).subtract(ObjectVector(edge[1][0], edge[1][1]))
        edgeVector.normalize()

        let cross = Math.abs(p.wind.force.clone().unit().cross(edgeVector.clone().unit()))

        let other
        if (edge.left === undefined) {
          let rp = polygons[edge.right.index]
          other = rp === p ? undefined : rp
        } else if (edge.right === undefined) {
          let lp = polygons[edge.left.index]
          other = lp === p ? undefined : lp
        } else {
          let lp = polygons[edge.left.index]
          let rp = polygons[edge.right.index]
          other = lp === p ? rp : lp
        }

        let c = ObjectVector(p.data[0], p.data[1])
        let ep = c.clone().add(p.wind.force.clone().unit())

        let centerDistance = distanceFromPointToSegment(c.getX(), c.getY(), edge[0][0], edge[0][1], edge[1][0], edge[1][1], true)
        let forceDistance = distanceFromPointToSegment(ep.getX(), ep.getY(), edge[0][0], edge[0][1], edge[1][0], edge[1][1], true)

        if (cross > 0 && forceDistance < centerDistance && other !== undefined) {
          let direction = ObjectVector((edge[0][0] + edge[1][0]) / 2, (edge[0][1] + edge[1][1]) / 2).subtract(ObjectVector(p.data[0], p.data[1])).unit()
          forwardEdges.push({polygon: other, direction})
        }
      })

      forwardEdges.map(function (fe) {
        let scalar = windForceScalar(p, fe.polygon)

        scalar += (fe.polygon.temperature - p.temperature) * 4

        let force = fe.direction.clone().multiplyByScalar(scalar)
        incoming.get(fe.polygon).push(force)
      })
    }
    // console.timeEnd("complex")

    /**/

    polygons.map(function (p) {
      let force = ObjectVector(0, 0)

      let inc = incoming.get(p)

      if (inc.length > 0) {
        let max = Math.max(...inc.map(i => i.magnitude()))

        inc.map(function (i) {
          force.add(i)
        })

        force.add(trade.clone().unit().multiplyByScalar(mapParameters.wind.tradeWindVelocity * mapParameters.wind.tradeWindInfluence))

        let newForce = force.normalize().multiplyByScalar(max)
        // let newForce = trade.clone()

        p.wind.force = newForce
      }
    })

    let min = Math.min(...polygons.map(p => p.wind.force.magnitude()))

    if (min > 0) {
      console.log('broke after ' + i + ' iterations')
      break
    }
  }

  for (let i = 0; i < polygons.length; i++) {
    let p = polygons[i]
    p.wind.velocity = p.wind.force.magnitude()

    let crossMax = 0
    let to = p

    let cell = diagram.cells[i]
    cell.halfedges.forEach(function (e) {
      let edge = diagram.edges[e]
      let edgeVector = ObjectVector(edge[0][0], edge[0][1]).subtract(ObjectVector(edge[1][0], edge[1][1]))
      edgeVector.normalize()

      let cross = Math.abs(p.wind.force.clone().unit().cross(edgeVector.clone().unit()))

      let other
      if (edge.left === undefined) {
        let rp = polygons[edge.right.index]
        other = rp === p ? undefined : rp
      } else if (edge.right === undefined) {
        let lp = polygons[edge.left.index]
        other = lp === p ? undefined : lp
      } else {
        let lp = polygons[edge.left.index]
        let rp = polygons[edge.right.index]
        other = lp === p ? rp : lp
      }

      let c = ObjectVector(p.data[0], p.data[1])
      let ep = c.clone().add(p.wind.force.clone().unit())

      let centerDistance = distanceFromPointToSegment(c.getX(), c.getY(), edge[0][0], edge[0][1], edge[1][0], edge[1][1], true)
      let forceDistance = distanceFromPointToSegment(ep.getX(), ep.getY(), edge[0][0], edge[0][1], edge[1][0], edge[1][1], true)

      // console.log({from: p.id, to: other !== undefined ? other.id : undefined, cross, centerDistance, forceDistance})

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

export function setWind (terrain) {
  baseline(terrain.polygons)
  propagate(terrain.diagram, terrain.polygons)
}
