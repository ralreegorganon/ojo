import d3Tip from 'd3-tip'
import { elevationInMetersAsl, temperatureInCelsius } from 'terrain/conversion'

export const tip = d3Tip()
  .attr('class', 'd3-tip')
  .html((d) => {
    const elevation = elevationInMetersAsl(d.elevation).toFixed(0)
    const temperature = temperatureInCelsius(d.temperature).toFixed(1)
    const temperaturef = Math.round(temperature * 1.8 + 32)
    const pressure = d.pressure.toFixed(3)
    const windSpeed = d.wind.velocity.toFixed(3)
    const moisture = d.moisture.toFixed(3)
    const absoluteHumidity = d.absoluteHumidity.toFixed(3)
    const relativeHumidity = (d.relativeHumidity * 100).toFixed(0)
    const downhillSlope = d.downhill.slope.toFixed(2)
    const downhillFlux = d.downhill.flux.toFixed(2)

    return `
    <table>
      <tr><td>id</td><td>${d.id}</td></tr>
      <tr><td>e (m)</td><td>${elevation}</td></tr>
      <tr><td>t (c)</td><td>${temperature}</td></tr>
      <tr><td>t (f)</td><td>${temperaturef}</td></tr>
      <tr><td>p (kPa)</td><td>${pressure}</td></tr>
      <tr><td>ws (m/s)</td><td>${windSpeed}</td></tr>
      <tr><td>m (cm)</td><td>${moisture}</td></tr>
      <tr><td>ah (g/m^3)</td><td>${absoluteHumidity}</td></tr>
      <tr><td>rh (%)</td><td>${relativeHumidity}</td></tr>
      <tr><td>biome</td><td>${d.biome.name}</td></tr>
      <tr><td>downhill slope</td><td>${downhillSlope}</td></tr>
      <tr><td>downhill flux</td><td>${downhillFlux}</td></tr>
    </table>
    `
  })

export function drawTooltips(g, polygons) {
  const tooltipsGroup = g.append('g').attr('id', 'tooltips')

  polygons.forEach((i, d) => {
    tooltipsGroup
      .append('path')
      .attr('d', `M${i.join('L')}Z`)
      .attr('id', d)
      .attr('pointer-events', 'all')
      .attr('fill', 'none')
      .on('mouseover', z => tip.show(i))
      .on('mouseout', z => tip.hide())
  })
}
