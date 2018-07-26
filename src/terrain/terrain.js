import * as d3 from 'd3'
import PoissonDiskSampling from 'poisson-disk-sampling'
import mapParameters from 'parameters'
import setElevations from 'terrain/elevation'
import { classifyTerrain } from 'terrain/classify'
import setTemperatures from 'terrain/temperature'
import setWind from 'terrain/wind'
import setPressures from 'terrain/pressure'
import setMoisture from 'terrain/moisture'
import setBiomes from 'terrain/biome'
import { doErosion } from 'terrain/erosion'

function buildPoints(maxDistance) {
  const pds = new PoissonDiskSampling([mapParameters.width, mapParameters.height], maxDistance)
  const points = pds.fill()
  return points
}

function relaxPoints(points) {
  const voronoi = d3.voronoi().extent([[0, 0], [mapParameters.width, mapParameters.height]])
  let relaxedPoints = voronoi(points)
    .polygons()
    .map(d3.polygonCentroid)
  relaxedPoints = voronoi(relaxedPoints)
    .polygons()
    .map(d3.polygonCentroid)
  return relaxedPoints
}

function buildPlates() {
  const voronoi = d3.voronoi().extent([[0, 0], [mapParameters.width, mapParameters.height]])
  const points = buildPoints(mapParameters.elevation.plates.maxDistance)
  const relaxedPoints = relaxPoints(points)
  const diagram = voronoi(relaxedPoints)
  const polygons = diagram.polygons()
  const triangles = diagram.triangles()
  const links = diagram.links()

  return {
    diagram,
    polygons,
    triangles,
    links
  }
}

function buildTerrain() {
  const points = buildPoints(mapParameters.pdsMaxDistance)
  // console.log(points)
  const relaxedPoints = relaxPoints(points)
  const voronoi = d3.voronoi().extent([[0, 0], [mapParameters.width, mapParameters.height]])
  const diagram = voronoi(relaxedPoints)
  const polygons = diagram.polygons()
  const triangles = diagram.triangles()
  const links = diagram.links()

  return {
    diagram,
    polygons,
    triangles,
    links
  }
}

function setNeighbors(diagram, polygons, links) {
  const siteToPolygon = new Map()

  polygons.forEach((p, i) => {
    p.id = i
    p.neighbors = []
    siteToPolygon.set(p.data, p)
  })

  links.forEach((l) => {
    const pSource = siteToPolygon.get(l.source)
    const pTarget = siteToPolygon.get(l.target)

    pSource.neighbors.push(pTarget)
    pTarget.neighbors.push(pSource)
  })
}

export default function build(world) {
  world.terrain = buildTerrain()
  world.terrain.plates = buildPlates()

  setNeighbors(world.terrain.diagram, world.terrain.polygons, world.terrain.links)
  setElevations(world.terrain, world.terrain.plates)
  classifyTerrain(world.terrain)
  setTemperatures(world.terrain)
  setPressures(world.terrain)
  setWind(world.terrain)
  setMoisture(world.terrain)
  doErosion(world.terrain)
  classifyTerrain(world.terrain)
  setBiomes(world.terrain)
}
