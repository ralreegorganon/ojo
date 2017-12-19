import * as d3 from 'd3'
import PoissonDiskSampling from 'poisson-disk-sampling'
import { defaultMapParameters, simplex } from './parameters.js'

function associatePolygonNeighbors (diagram, polygons) {
  polygons.map(function (p, i) {
    p.index = i
    p.elevation = 0
    let neighbors = []
    diagram.cells[i].halfedges.forEach(function (e) {
      let edge = diagram.edges[e]
      let ea
      if (edge.left && edge.right) {
        ea = edge.left.index
        if (ea === i) {
          ea = edge.right.index
        }
        neighbors.push(ea)
      }
    })
    p.neighbors = neighbors
  })
}

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

function setElevations (polygons) {
  let min = 0
  let max = 0
  polygons.map(function (p) {
    p.elevation = octavation(8, p.data[0] / defaultMapParameters.width, p.data[1] / defaultMapParameters.height, 0.5, 2)
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
  })
}

export function buildTerrain () {
  let pds = new PoissonDiskSampling([defaultMapParameters.width, defaultMapParameters.height], defaultMapParameters.pdsMaxDistance)
  let points = pds.fill()

  console.log({ p: points.length, width: defaultMapParameters.width, height: defaultMapParameters.height })

  let voronoi = d3.voronoi().extent([[0, 0], [defaultMapParameters.width, defaultMapParameters.height]])
  let relaxedPoints = voronoi(points).polygons().map(d3.polygonCentroid)
  relaxedPoints = voronoi(relaxedPoints).polygons().map(d3.polygonCentroid)
  let diagram = voronoi(relaxedPoints)
  let polygons = diagram.polygons()

  associatePolygonNeighbors(diagram, polygons)
  setElevations(polygons)
  return polygons
}
