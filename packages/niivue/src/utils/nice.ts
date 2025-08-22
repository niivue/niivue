export const nice = (x: number, round: boolean): number => {
  const exp = Math.floor(Math.log(x) / Math.log(10))
  const f = x / Math.pow(10, exp)
  let nf
  if (round) {
    if (f < 1.5) {
      nf = 1
    } else if (f < 3) {
      nf = 2
    } else if (f < 7) {
      nf = 5
    } else {
      nf = 10
    }
  } else {
    if (f <= 1) {
      nf = 1
    } else if (f <= 2) {
      nf = 2
    } else if (f <= 5) {
      nf = 5
    } else {
      nf = 10
    }
  }
  return nf * Math.pow(10, exp)
}
