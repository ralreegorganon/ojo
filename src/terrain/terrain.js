import * as d3 from 'd3'
import PoissonDiskSampling from 'poisson-disk-sampling'
import { mapParameters } from 'parameters'
import {setElevations} from 'terrain/elevation'
import { classifyTerrain } from 'terrain/classify'

function buildPoints () {
  let pds = new PoissonDiskSampling([mapParameters.width, mapParameters.height], mapParameters.pdsMaxDistance)
  let points = pds.fill()
  return points
}

function relaxPoints (points) {
  let voronoi = d3.voronoi().extent([[0, 0], [mapParameters.width, mapParameters.height]])
  let relaxedPoints = voronoi(points).polygons().map(d3.polygonCentroid)
  relaxedPoints = voronoi(relaxedPoints).polygons().map(d3.polygonCentroid)
  return relaxedPoints
}

export function buildTerrain (world) {
  let points = buildPoints()
  console.log({ p: points.length, width: mapParameters.width, height: mapParameters.height })

  let relaxedPoints = relaxPoints(points)

  let voronoi = d3.voronoi().extent([[0, 0], [mapParameters.width, mapParameters.height]])

  let diagram = voronoi(relaxedPoints)
  let polygons = diagram.polygons()
  let triangles = diagram.triangles()
  let links = diagram.links()

  world.terrain = {
    diagram, polygons, triangles, links
  }

  console.time('setElevations')
  setElevations(world.terrain.polygons)
  console.timeEnd('setElevations')

  console.time('classifyTerrain')
  classifyTerrain(world.terrain)
  console.timeEnd('classifyTerrain')
}
