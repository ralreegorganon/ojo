export function bounds (arr, idx) {
  let max = Number.MIN_VALUE
  let min = Number.MAX_VALUE
  arr.forEach(function (e) {
    let it = idx(e)
    if (max < it) {
      max = it
    }
    if (min > it) {
      min = it
    }
  })
  return { max: max, min: min }
}
