export default function drawTriangles(g, triangles) {
  const trianglesGroup = g.append('g').attr('id', 'triangles')
  triangles.forEach((t) => {
    trianglesGroup
      .append('path')
      .attr('d', `M${t.join('L')}Z`)
      .attr('stroke', 'black')
      .attr('fill', 'none')
      .attr('stroke-width', '0.7')
  })
}
