import { elevationInMetersAsl } from 'terrain/conversion'

function baseline(polygons) {
  polygons.forEach((p) => {
    p.pressure = 101.325 * Math.exp(-0.00012 * elevationInMetersAsl(p.elevation))
  })
}

export default function setPressures(terrain) {
  baseline(terrain.polygons)
}
