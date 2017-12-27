import { groupBy } from 'lodash'
import { mapParameters } from 'parameters'

function setNeighbors (diagram, polygons, links) {
  let siteToPolygon = new Map()

  polygons.map(function (p, i) {
    p.neighbors = []
    siteToPolygon.set(p.data, p)
  })

  links.forEach(function (l) {
    let pSource = siteToPolygon.get(l.source)
    let pTarget = siteToPolygon.get(l.target)

    pSource.neighbors.push(pTarget)
    pTarget.neighbors.push(pSource)
  })
}

function setType (diagram, polygons) {
  let queue = []
  let used = new Set()

  let startIndex = diagram.find(0, 0).index
  let start = polygons[startIndex]
  queue.push(start)
  used.add(start)

  let type = 'Ocean'
  start.featureType = type
  start.featureIndex = 0
  while (queue.length > 0) {
    let p = queue[0]
    queue.shift()
    p.neighbors.forEach(function (n) {
      if (!used.has(n) && n.elevation < mapParameters.seaLevel) {
        n.featureType = type
        n.featureIndex = 0
        queue.push(n)
        used.add(n)
      }
    })
  }

  let unmarked = polygons.filter(p => !p.featureType)
  let featureIndex = 0
  let landIndex = 0
  let lakeIndex = 0

  while (unmarked.length > 0) {
    let greater
    let less

    if (unmarked[0].elevation >= mapParameters.seaLevel) {
      type = 'Land'
      greater = mapParameters.seaLevel
      less = 100
      featureIndex = landIndex
      landIndex++
    } else {
      type = 'Lake'
      greater = -100
      less = mapParameters.seaLevel
      featureIndex = lakeIndex
      lakeIndex++
    }

    start = unmarked[0]
    start.featureType = type
    start.featureIndex = featureIndex
    queue.push(start)
    used.add(start)
    while (queue.length > 0) {
      let p = queue[0]
      queue.shift()
      p.neighbors.forEach(function (n) {
        let alreadyProcessed = used.has(n)
        let elevationAboveMin = n.elevation >= greater
        let elevationBelowMax = n.elevation < less
        if (!alreadyProcessed && elevationAboveMin && elevationBelowMax) {
          n.featureType = type
          n.featureIndex = featureIndex
          queue.push(n)
          used.add(n)
        }
      })
    }
    unmarked = polygons.filter(p => !p.featureType)
  }

  let oceanpoly = groupBy(polygons.filter(p => p.featureType === 'Ocean'), p => p.featureIndex)
  let landpoly = groupBy(polygons.filter(p => p.featureType === 'Land'), p => p.featureIndex)
  let lakepoly = groupBy(polygons.filter(p => p.featureType === 'Lake'), p => p.featureIndex)

  console.log({ oceanpoly, landpoly, lakepoly })
}

export function classifyTerrain (terrain) {
  console.time('setNeighbors')
  setNeighbors(terrain.diagram, terrain.polygons, terrain.links)
  console.timeEnd('setNeighbors')

  console.time('setType')
  setType(terrain.diagram, terrain.polygons)
  console.timeEnd('setType')
}
