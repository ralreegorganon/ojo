import * as d3 from "d3";
import { Vector } from "vector2d";
import mapParameters from "parameters";

export default function drawPlates(g, polygons) {
  const x = d3
    .scaleLinear()
    .domain([0, mapParameters.width])
    .range([0, mapParameters.width]);
  const y = d3
    .scaleLinear()
    .domain([0, mapParameters.height])
    .range([0, mapParameters.height]);
  const path = d3
    .line()
    .x(d => x(d.x))
    .y(d => y(d.y));

  const plateGroup = g.append("g").attr("id", "plates");

  polygons.forEach(p => {
    plateGroup
      .append("path")
      .attr("d", `M${p.join("L")}Z`)
      .attr("stroke", "white")
      .attr("stroke-width", "1")
      .attr("stroke-linejoin", "round")
      .attr("fill", "none");

    if (mapParameters.render.plates.drawForce && p.force !== undefined) {
      const c = new Vector(p.data[0], p.data[1]);
      const ep = c.clone().add(p.force.clone());
      const data = [{ x: c.getX(), y: c.getY() }, { x: ep.getX(), y: ep.getY() }];

      plateGroup
        .append("path")
        .attr("d", path(data))
        .attr("stroke", "red")
        .attr("stroke-width", "1")
        .attr("stroke-linejoin", "round")
        .attr("fill", "none")
        .attr("marker-start", "url(#marker_square)")
        .attr("marker-end", "url(#marker_arrow)");
    }
  });
}
