import mapParameters from 'parameters'
import { bounds } from 'utility/math'

export function fillSinks(polygons, diagram) {
  const epsilon = 1e-5
  const newHeights = new Map()

  polygons.forEach((p) => {
    newHeights.set(p.id, 999)
  })

  for (let i = 0; i < mapParameters.height; i++) {
    const left = polygons[diagram.find(0, i).index]
    const right = polygons[diagram.find(mapParameters.width, i).index]

    newHeights.set(left.id, left.elevation)
    newHeights.set(right, right.elevation)
  }

  for (let i = 0; i < mapParameters.width; i++) {
    const top = polygons[diagram.find(i, 0).index]
    const bottom = polygons[diagram.find(i, mapParameters.height).index]
    newHeights.set(top, top.elevation)
    newHeights.set(bottom, bottom.elevation)
  }

  while (true) {
    let changed = false
    polygons.forEach((p) => {
      const ph = newHeights.get(p.id)
      if (ph === p.elevation) {
        return
      }
      p.neighbors.forEach((n) => {
        const nh = newHeights.get(n.id)
        if (p.elevation >= nh + epsilon) {
          newHeights.set(p.id, p.elevation)
          changed = true
          return
        }
        const oh = nh + epsilon
        if (ph > oh && oh > p.elevation) {
          newHeights.set(p.id, oh)
          changed = true
        }
      })
    })

    if (!changed) {
      break
    }
  }

  polygons.forEach((p) => {
    if (p.featureType !== 'Ocean') {
      p.elevation = newHeights.get(p.id)
    }
  })
}

function downhill(polygons) {
  polygons.forEach((p) => {
    p.downhill = {
      target: undefined,
      flux: 0,
      slope: 0,
      erosionRate: 0
    }

    let lowest = p
    p.neighbors.forEach((n) => {
      if (n.elevation < lowest.elevation) {
        lowest = n
      }
    })

    if (lowest !== p) {
      const deltaElevation = Math.sqrt(p.elevation ** 2 + lowest.elevation ** 2)
      const distance = Math.sqrt((p.data[0] - lowest.data[0]) ** 2 + (p.data[1] - lowest.data[1]) ** 2)
      const slope = deltaElevation / distance

      p.downhill = {
        target: lowest,
        flux: p.moisture,
        slope,
        erosionRate: 0
      }
    }
  })
}

function fluxify(polygons) {
  polygons
    .slice()
    .sort((a, b) => b.elevation - a.elevation)
    .forEach((p) => {
      if (p.featureType === 'Land') {
        p.downhill.target.downhill.flux += p.downhill.flux

        const river =
          Math.sqrt(p.downhill.flux) * p.downhill.slope * mapParameters.erosion.riverFactor
        const creep = p.downhill.slope * p.downhill.slope * mapParameters.erosion.creepFactor

        p.downhill.erosionRate = Math.min(river + creep, mapParameters.erosion.maxErosionRate)
      }
    })
}

function erode(polygons) {
  const minMax = bounds(polygons, p => p.downhill.erosionRate)

  polygons.forEach((p) => {
    p.elevation -=
      mapParameters.erosion.defaultErosionAmount * (p.downhill.erosionRate / minMax.max)
  })

  polygons.forEach((p) => {
    let averageElevation = p.elevation
    p.neighbors.forEach((n) => {
      averageElevation += n.elevation
    })
    averageElevation /= p.neighbors.length + 1
    p.elevation = averageElevation
  })
}

export function doErosion(terrain) {
  fillSinks(terrain.polygons, terrain.diagram)
  downhill(terrain.polygons)
  fluxify(terrain.polygons)

  if (mapParameters.erosion.apply) {
    erode(terrain.polygons)
  }
}
