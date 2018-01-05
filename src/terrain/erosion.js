import { mapParameters } from 'parameters'
import { bounds, randomRange } from 'utility/math'

export function fillSinks (polygons, diagram) {
  let epsilon = 1e-5
  let newHeights = new Map()

  polygons.map(function (p) {
    newHeights.set(p.id, 999)
  })

  for (let i = 0; i < mapParameters.height; i++) {
    let left = polygons[diagram.find(0, i).index]
    let right = polygons[diagram.find(mapParameters.width, i).index]

    newHeights.set(left.id, left.elevation)
    newHeights.set(right, right.elevation)
  }

  for (let i = 0; i < mapParameters.width; i++) {
    let top = polygons[diagram.find(i, 0).index]
    let bottom = polygons[diagram.find(i, mapParameters.height).index]
    newHeights.set(top, top.elevation)
    newHeights.set(bottom, bottom.elevation)
  }

  while (true) {
    let changed = false
    polygons.map(function (p) {
      let ph = newHeights.get(p.id)
      if (ph === p.elevation) {
        return
      }
      p.neighbors.map(function (n) {
        let nh = newHeights.get(n.id)
        if (p.elevation >= nh + epsilon) {
          newHeights.set(p.id, p.elevation)
          changed = true
          return
        }
        let oh = nh + epsilon
        if ((ph > oh) && (oh > p.elevation)) {
          newHeights.set(p.id, oh)
          changed = true
        }
      })
    })

    if (!changed) {
      break
    }
  }

  polygons.map(function (p) {
    if (p.featureType !== 'Ocean') {
      p.elevation = newHeights.get(p.id)
    }
  })
}

function downhill (polygons) {
  polygons.map(function (p) {
    p.downhill = {target: undefined, flux: 0, slope: 0, erosionRate: 0}

    let lowest = p
    p.neighbors.map(function (n) {
      if (n.elevation < lowest.elevation) {
        lowest = n
      }
    })

    if (lowest !== p) {
      let deltaElevation = Math.sqrt(Math.pow(p.elevation, 2) + Math.pow(lowest.elevation, 2))
      let distance = Math.sqrt(Math.pow(p.data[0] - lowest.data[0], 2) + Math.pow(p.data[1] - lowest.data[1], 2))
      let slope = deltaElevation / distance

      p.downhill = {target: lowest, flux: p.moisture, slope, erosionRate: 0}
    }
  })
}

function fluxify (polygons) {
  polygons.slice().sort((a, b) => b.elevation - a.elevation).map(p => {
    if (p.featureType === 'Land') {
      p.downhill.target.downhill.flux += p.downhill.flux

      let river = Math.sqrt(p.downhill.flux) * p.downhill.slope * mapParameters.erosion.riverFactor
      let creep = p.downhill.slope * p.downhill.slope * mapParameters.erosion.creepFactor

      p.downhill.erosionRate = Math.min(river + creep, mapParameters.erosion.maxErosionRate)
    }
  })
}

function erode (polygons) {
  let minMax = bounds(polygons, p => p.downhill.erosionRate)

  polygons.map(p => {
    p.elevation = p.elevation - mapParameters.erosion.defaultErosionAmount * (p.downhill.erosionRate / minMax.max)
  })

  polygons.map(function (p) {
    let averageElevation = p.elevation
    p.neighbors.forEach(function (n) {
      averageElevation += n.elevation
    })
    averageElevation /= (p.neighbors.length + 1)
    p.elevation = averageElevation
  })
}

export function doErosion (terrain) {
  fillSinks(terrain.polygons, terrain.diagram)
  downhill(terrain.polygons)
  fluxify(terrain.polygons)

  if (mapParameters.erosion.apply) {
    erode(terrain.polygons)
  }
}
