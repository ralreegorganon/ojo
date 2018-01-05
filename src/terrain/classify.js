import { groupBy } from 'lodash'
import { mapParameters } from 'parameters'
import { bounds } from 'utility/math'

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
}

export function markRivers (polygons) {
  polygons.map(function (p) {
    p.isRiver = p.featureType === 'Land' && p.downhill !== undefined && p.downhill.flux > 1000
  })
}

export function classifyTerrain (terrain) {
  console.time('setType')
  setType(terrain.diagram, terrain.polygons)
  markRivers(terrain.polygons)
  console.timeEnd('setType')
}
