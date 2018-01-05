import * as d3 from 'd3'
import PoissonDiskSampling from 'poisson-disk-sampling'
import { mapParameters } from 'parameters'
import { setElevations } from 'terrain/elevation'
import { classifyTerrain } from 'terrain/classify'
import { setTemperatures } from 'terrain/temperature'
import { setWind } from 'terrain/wind'
import { setPressures } from 'terrain/pressure'
import { setMoisture } from 'terrain/moisture'
import { setBiomes } from 'terrain/biome'
import { doErosion } from 'terrain/erosion'

function buildPoints (maxDistance) {
  let pds = new PoissonDiskSampling([mapParameters.width, mapParameters.height], maxDistance)
  let points = pds.fill()
  return points
}

function relaxPoints (points) {
  let voronoi = d3.voronoi().extent([[0, 0], [mapParameters.width, mapParameters.height]])
  let relaxedPoints = voronoi(points).polygons().map(d3.polygonCentroid)
  relaxedPoints = voronoi(relaxedPoints).polygons().map(d3.polygonCentroid)
  return relaxedPoints
}

function buildPlates (world) {
  let voronoi = d3.voronoi().extent([[0, 0], [mapParameters.width, mapParameters.height]])
  let points = buildPoints(mapParameters.elevation.plates.maxDistance)
  let relaxedPoints = relaxPoints(points)
  let diagram = voronoi(relaxedPoints)
  let polygons = diagram.polygons()
  let triangles = diagram.triangles()
  let links = diagram.links()

  return {
    diagram, polygons, triangles, links
  }
}

function buildTerrain (world) {
  let points = buildPoints(mapParameters.pdsMaxDistance)
  let relaxedPoints = relaxPoints(points)
  let voronoi = d3.voronoi().extent([[0, 0], [mapParameters.width, mapParameters.height]])
  let diagram = voronoi(relaxedPoints)
  let polygons = diagram.polygons()
  let triangles = diagram.triangles()
  let links = diagram.links()

  return {
    diagram, polygons, triangles, links
  }
}

function setNeighbors (diagram, polygons, links) {
  let siteToPolygon = new Map()

  polygons.map(function (p, i) {
    p.id = i
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

export function build (world) {
  console.time('buildTerrain')
  world.terrain = buildTerrain(world)
  console.timeEnd('buildTerrain')

  console.time('buildPlates')
  world.terrain.plates = buildPlates(world)
  console.timeEnd('buildPlates')

  console.time('setNeighbors')
  setNeighbors(world.terrain.diagram, world.terrain.polygons, world.terrain.links)
  console.timeEnd('setNeighbors')

  console.time('setElevations')
  setElevations(world.terrain, world.terrain.plates)
  console.timeEnd('setElevations')

  console.time('classifyTerrain')
  classifyTerrain(world.terrain)
  console.timeEnd('classifyTerrain')

  console.time('setTemperatures')
  setTemperatures(world.terrain)
  console.timeEnd('setTemperatures')

  console.time('setPressures')
  setPressures(world.terrain)
  console.timeEnd('setPressures')

  console.time('setWind')
  setWind(world.terrain)
  console.timeEnd('setWind')

  console.time('setMoisture')
  setMoisture(world.terrain)
  console.timeEnd('setMoisture')

  console.time('doErosion')
  doErosion(world.terrain)
  console.timeEnd('doErosion')

  console.time('classifyTerrain')
  classifyTerrain(world.terrain)
  console.timeEnd('classifyTerrain')

  console.time('setBiomes')
  setBiomes(world.terrain)
  console.timeEnd('setBiomes')
}
