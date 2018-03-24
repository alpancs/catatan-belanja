Number.prototype.pretty = function () {
  let text = String(Math.abs(this))
  let result = text.slice(-3)
  while (text.length > 3) {
    text = text.slice(0, -3)
    result = text.slice(-3) + "." + result
  }
  return (this < 0 ? "-" : "") + result
}

Array.prototype.sumBy = function (key) {
  return this.reduce((total, curr) => total + curr[key], 0)
}

Array.prototype.sample = function () {
  return this[Math.floor(Math.random() * this.length)]
}

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

Date.prototype.simple = function () {
  return `${this.getDate()} ${MONTH_NAMES[this.getMonth()]}`
}
