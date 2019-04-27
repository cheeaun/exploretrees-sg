// Copied from https://github.com/yongjun21/sg-heatmap/blob/master/src/helpers/svy21.js

function SVY21 (config) {
  /**
   * Ref: http://www.linz.govt.nz/geodetic/conversion-coordinates/projection-conversions/transverse-mercator-preliminary-computations/index.aspx
   *
   * SVY21 Projection
   * Fundamental point: Base 7 at Pierce Resevoir.
   * Latitude: 1 22 02.9154 N, longitude: 103 49 31.9752 E (of Greenwich).
   *
   * Known Issue: Setting (oLat, oLon) to the exact coordinates specified above
   * results in computation being slightly off. The values below give the most
   * accurate represenation of test data.
   */

  const defaultConfig = {
    // WGS84 Datum
    a: 6378137,
    f: 1 / 298.257223563,

    oLat: 1.366666,     // origin's lat in degrees
    oLon: 103.833333,   // origin's lon in degrees
    oN: 38744.572,      // false Northing
    oE: 28001.642,      // false Easting
    k: 1                // scale factor
  }

  Object.assign(this, defaultConfig, config)

  this.b = this.a * (1 - this.f)
  this.e2 = (2 * this.f) - (this.f * this.f)
  this.e4 = this.e2 * this.e2
  this.e6 = this.e4 * this.e2
  this.A0 = 1 - (this.e2 / 4) - (3 * this.e4 / 64) - (5 * this.e6 / 256)
  this.A2 = (3.0 / 8.0) * (this.e2 + (this.e4 / 4) + (15 * this.e6 / 128))
  this.A4 = (15.0 / 256.0) * (this.e4 + (3 * this.e6 / 4))
  this.A6 = 35 * this.e6 / 3072
}

// Returns a pair (N, E) representing Northings and Eastings in SVY21.
SVY21.prototype.computeSVY21 = function (lat, lon) {
  const latR = lat * Math.PI / 180
  const sinLat = Math.sin(latR)
  const sin2Lat = sinLat * sinLat
  const cosLat = Math.cos(latR)
  const cos2Lat = cosLat * cosLat
  const cos3Lat = cos2Lat * cosLat
  const cos4Lat = cos3Lat * cosLat
  const cos5Lat = cos4Lat * cosLat
  const cos6Lat = cos5Lat * cosLat
  const cos7Lat = cos6Lat * cosLat

  const rho = this.calcRho(sin2Lat)
  const v = this.calcV(sin2Lat)
  const psi = v / rho
  const t = Math.tan(latR)
  const w = (lon - this.oLon) * Math.PI / 180

  const M = this.calcM(lat)
  const Mo = this.calcM(this.oLat)

  const w2 = w * w
  const w4 = w2 * w2
  const w6 = w4 * w2
  const w8 = w6 * w2

  const psi2 = psi * psi
  const psi3 = psi2 * psi
  const psi4 = psi3 * psi

  const t2 = t * t
  const t4 = t2 * t2
  const t6 = t4 * t2

  // Compute Northing
  const nTerm1 = w2 / 2 * v * sinLat * cosLat
  const nTerm2 = w4 / 24 * v * sinLat * cos3Lat * (4 * psi2 + psi - t2)
  const nTerm3 = w6 / 720 * v * sinLat * cos5Lat * ((8 * psi4) * (11 - 24 * t2) - (28 * psi3) * (1 - 6 * t2) + psi2 * (1 - 32 * t2) - psi * 2 * t2 + t4)
  const nTerm4 = w8 / 40320 * v * sinLat * cos7Lat * (1385 - 3111 * t2 + 543 * t4 - t6)
  const N = this.oN + this.k * (M - Mo + nTerm1 + nTerm2 + nTerm3 + nTerm4)

  // Compute Easting
  const eTerm1 = w2 / 6 * cos2Lat * (psi - t2)
  const eTerm2 = w4 / 120 * cos4Lat * ((4 * psi3) * (1 - 6 * t2) + psi2 * (1 + 8 * t2) - psi * 2 * t2 + t4)
  const eTerm3 = w6 / 5040 * cos6Lat * (61 - 479 * t2 + 179 * t4 - t6)
  const E = this.oE + this.k * v * w * cosLat * (1 + eTerm1 + eTerm2 + eTerm3)

  return {N, E}
}

// Returns a pair (lat, lon) representing Latitude and Longitude.
SVY21.prototype.computeLatLon = function (N, E) {
  const Nprime = N - this.oN
  const Mo = this.calcM(this.oLat)
  const Mprime = Mo + (Nprime / this.k)
  const n = (this.a - this.b) / (this.a + this.b)
  const n2 = n * n
  const n3 = n2 * n
  const n4 = n2 * n2
  const G = this.a * (1 - n) * (1 - n2) * (1 + (9 * n2 / 4) + (225 * n4 / 64)) * (Math.PI / 180)
  const sigma = (Mprime * Math.PI) / (180.0 * G)

  const latPrimeT1 = ((3 * n / 2) - (27 * n3 / 32)) * Math.sin(2 * sigma)
  const latPrimeT2 = ((21 * n2 / 16) - (55 * n4 / 32)) * Math.sin(4 * sigma)
  const latPrimeT3 = (151 * n3 / 96) * Math.sin(6 * sigma)
  const latPrimeT4 = (1097 * n4 / 512) * Math.sin(8 * sigma)
  const latPrime = sigma + latPrimeT1 + latPrimeT2 + latPrimeT3 + latPrimeT4

  const sinLatPrime = Math.sin(latPrime)
  const sin2LatPrime = sinLatPrime * sinLatPrime

  const rhoPrime = this.calcRho(sin2LatPrime)
  const vPrime = this.calcV(sin2LatPrime)
  const psiPrime = vPrime / rhoPrime
  const psiPrime2 = psiPrime * psiPrime
  const psiPrime3 = psiPrime2 * psiPrime
  const psiPrime4 = psiPrime3 * psiPrime
  const tPrime = Math.tan(latPrime)
  const tPrime2 = tPrime * tPrime
  const tPrime4 = tPrime2 * tPrime2
  const tPrime6 = tPrime4 * tPrime2
  const Eprime = E - this.oE
  const x = Eprime / (this.k * vPrime)
  const x2 = x * x
  const x3 = x2 * x
  const x5 = x3 * x2
  const x7 = x5 * x2

  // Compute Latitude
  const latFactor = tPrime / (this.k * rhoPrime)
  const latTerm1 = latFactor * ((Eprime * x) / 2)
  const latTerm2 = latFactor * ((Eprime * x3) / 24) * ((-4 * psiPrime2) + (9 * psiPrime) * (1 - tPrime2) + (12 * tPrime2))
  const latTerm3 = latFactor * ((Eprime * x5) / 720) * ((8 * psiPrime4) * (11 - 24 * tPrime2) - (12 * psiPrime3) * (21 - 71 * tPrime2) + (15 * psiPrime2) * (15 - 98 * tPrime2 + 15 * tPrime4) + (180 * psiPrime) * (5 * tPrime2 - 3 * tPrime4) + 360 * tPrime4)
  const latTerm4 = latFactor * ((Eprime * x7) / 40320) * (1385 - 3633 * tPrime2 + 4095 * tPrime4 + 1575 * tPrime6)
  const lat = latPrime - latTerm1 + latTerm2 - latTerm3 + latTerm4

  // Compute Longitude
  const secLatPrime = 1.0 / Math.cos(lat)
  const lonTerm1 = x * secLatPrime
  const lonTerm2 = ((x3 * secLatPrime) / 6) * (psiPrime + 2 * tPrime2)
  const lonTerm3 = ((x5 * secLatPrime) / 120) * ((-4 * psiPrime3) * (1 - 6 * tPrime2) + psiPrime2 * (9 - 68 * tPrime2) + 72 * psiPrime * tPrime2 + 24 * tPrime4)
  const lonTerm4 = ((x7 * secLatPrime) / 5040) * (61 + 662 * tPrime2 + 1320 * tPrime4 + 720 * tPrime6)
  const lon = (this.oLon * Math.PI / 180) + lonTerm1 - lonTerm2 + lonTerm3 - lonTerm4

  return {lat: lat / (Math.PI / 180), lon: lon / (Math.PI / 180)}
}

SVY21.prototype.calcM = function (lat, lon) {
  const latR = lat * Math.PI / 180
  return this.a * ((this.A0 * latR) - (this.A2 * Math.sin(2 * latR)) + (this.A4 * Math.sin(4 * latR)) - (this.A6 * Math.sin(6 * latR)))
}

SVY21.prototype.calcRho = function (sin2Lat) {
  const num = this.a * (1 - this.e2)
  const denom = Math.pow(1 - this.e2 * sin2Lat, 3.0 / 2.0)
  return num / denom
}

SVY21.prototype.calcV = function (sin2Lat) {
  const poly = 1 - this.e2 * sin2Lat
  return this.a / Math.sqrt(poly)
}

module.exports = SVY21;