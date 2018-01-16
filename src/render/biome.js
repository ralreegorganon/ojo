import { temperatureInCelsius } from 'terrain/conversion'

function colorLandBiome(biomeName) {
  switch (biomeName) {
    case 'polar desert':
      return '#fcfcfc'

    case 'subpolar dry tundra':
      return '#808080'
    case 'subpolar moist tundra':
      return '#608080'
    case 'subpolar wet tundra':
      return '#408090'
    case 'subpolar rain tundra':
      return '#2080C0'

    case 'boreal desert':
      return '#A0A080'
    case 'boreal dry scrub':
      return '#80A080'
    case 'boreal moist forest':
      return '#60A080'
    case 'boreal wet forest':
      return '#40A090'
    case 'boreal rain forest':
      return '#20A0C0'

    case 'cool temperate desert':
      return '#C0C080'
    case 'cool temperate desert scrub':
      return '#A0C080'
    case 'cool temperate steppe':
      return '#80C080'
    case 'cool temperate moist forest':
      return '#60C080'
    case 'cool temperate wet forest':
      return '#40C090'
    case 'cool temperate rain forest':
      return '#20C0C0'

    case 'warm temperate desert':
      return '#E0E080'
    case 'warm temperate desert scrub':
      return '#C0E080'
    case 'warm temperate thorn scrub':
      return '#A0E080'
    case 'warm temperate dry forest':
      return '#80E080'
    case 'warm temperate moist forest':
      return '#60E080'
    case 'warm temperate wet forest':
      return '#40E090'
    case 'warm temperate rain forest':
      return '#20E0C0'

    case 'subtropical desert':
      return '#E0E080'
    case 'subtropical desert scrub':
      return '#C0E080'
    case 'subtropical thorn woodland':
      return '#A0E080'
    case 'subtropical dry forest':
      return '#80E080'
    case 'subtropical moist forest':
      return '#60E080'
    case 'subtropical wet forest':
      return '#40E090'
    case 'subtropical rain forest':
      return '#20E0C0'

    case 'tropical desert':
      return '#FFFF80'
    case 'tropical desert scrub':
      return '#E0FF80'
    case 'tropical thorn woodland':
      return '#C0FF80'
    case 'tropical very dry forest':
      return '#A0FF80'
    case 'tropical dry forest':
      return '#80FF80'
    case 'tropical moist forest':
      return '#60FF80'
    case 'tropical wet forest':
      return '#40FF90'
    case 'tropical rain forest':
      return '#20FFA0'
    default:
      return '#000'
  }
}

function colorOceanBiome(temperature, depth) {
  if (temperature < 0) {
    return '#f0f0f0'
  }

  if (depth > 0.15) {
    return '#446CDE'
  }

  return '#071BCA'
}

export default function drawBiomes(g, polygons) {
  const biomeGroup = g.append('g').attr('id', 'biome')
  polygons.forEach((p) => {
    if (p.featureType === 'Land') {
      biomeGroup
        .append('path')
        .attr('d', `M${p.join('L')}Z`)
        .attr('fill', colorLandBiome(p.biome.name))
    } else if (p.featureType === 'Ocean') {
      biomeGroup
        .append('path')
        .attr('d', `M${p.join('L')}Z`)
        .attr('fill', colorOceanBiome(temperatureInCelsius(p.temperature), p.elevation))
    }
  })
}
