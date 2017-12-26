import * as d3 from 'd3'
import PoissonDiskSampling from 'poisson-disk-sampling'
import { defaultMapParameters, simplex } from './parameters.js'
import {groupBy} from 'lodash'

function octavation (iterations, x, y, persistence, scale) {
  let amplitude = 1
  let frequency = scale
  let noise = 0

  for (let i = 0; i < iterations; i++) {
    noise += simplex.noise2D(frequency * x, frequency * y) * amplitude
    amplitude *= persistence
    frequency *= 2
  }

  return noise
}

function islandMask (x, y, width, height) {
  let dx = Math.abs(x - width * 0.5)
  let dy = Math.abs(y - height * 0.5)
  let d = Math.max(dx, dy)

  let mw = width * 0.55 - 5
  let delta = d / mw
  let g = delta * delta

  return g
}

function setElevations (polygons) {
  let min = 0
  let max = 0
  polygons.map(function (p) {
    p.elevation = octavation(16, p.data[0] / defaultMapParameters.width, p.data[1] / defaultMapParameters.height, 0.5, 2)
    p.step = islandMask(p.data[0], p.data[1], defaultMapParameters.width, defaultMapParameters.height)

    if (p.elevation < min) {
      min = p.elevation
    }
    if (p.elevation > max) {
      max = p.elevation
    }
  })

  polygons.map(function (p) {
    p.elevation = (p.elevation - min) / (max - min)
    p.elevation = Math.pow(p.elevation, 2)
    p.elevation *= Math.max(0, 1 - p.step)
  })
}

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
      if (!used.has(n) && n.elevation < 0.2) {
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

    if (unmarked[0].elevation >= 0.2) {
      type = 'Land'
      greater = 0.2
      less = 100
      featureIndex = landIndex
      landIndex++
    } else {
      type = 'Lake'
      greater = -100
      less = 0.2
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

  console.log({oceanpoly, landpoly, lakepoly})
}

export function buildTerrain (world) {
  let pds = new PoissonDiskSampling([defaultMapParameters.width, defaultMapParameters.height], defaultMapParameters.pdsMaxDistance)
  let points = pds.fill()

  console.log({ p: points.length, width: defaultMapParameters.width, height: defaultMapParameters.height })

  let voronoi = d3.voronoi().extent([[0, 0], [defaultMapParameters.width, defaultMapParameters.height]])
  let relaxedPoints = voronoi(points).polygons().map(d3.polygonCentroid)
  relaxedPoints = voronoi(relaxedPoints).polygons().map(d3.polygonCentroid)
  let diagram = voronoi(relaxedPoints)
  let polygons = diagram.polygons()
  let triangles = diagram.triangles()
  let links = diagram.links()

  console.time('setNeighbors')
  setNeighbors(diagram, polygons, links)
  console.timeEnd('setNeighbors')

  console.time('setElevations')
  setElevations(polygons)
  console.timeEnd('setElevations')

  console.time('setType')
  setType(diagram, polygons)
  console.timeEnd('setType')

  world.terrain = {
    diagram, polygons, triangles, links
  }
}
