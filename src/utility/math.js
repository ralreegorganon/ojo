export function bounds(arr, idx) {
  let max = Number.MIN_VALUE
  let min = Number.MAX_VALUE
  arr.forEach((e) => {
    const it = idx(e)
    if (max < it) {
      max = it
    }
    if (min > it) {
      min = it
    }
  })
  return { max, min }
}

export function randomRange(low, high) {
  return low + Math.random() * (high - low)
}

export function distanceFromPointToSegment(x, y, x0, y0, x1, y1, segment) {
  const d = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)
  const t = ((x - x0) * (x1 - x0) + (y - y0) * (y1 - y0)) / d

  if (segment && t < 0) {
    return Math.sqrt((x - x0) * (x - x0) + (y - y0) * (y - y0))
  }

  if (segment && t > 1) {
    return Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1))
  }

  const xp = x0 + t * (x1 - x0)
  const yp = y0 + t * (y1 - y0)
  return Math.sqrt((x - xp) * (x - xp) + (y - yp) * (y - yp))
}
