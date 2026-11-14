import { describe, it, expect } from 'vitest'
import { UNKNOWN, show, rangeText, habitatText, coversO2, coversPressure } from '../src/lib/format.js'

// Single-value habitat, like ISS cabin air.
const iss = { id: 'iss', o2: 21, pressure_atm: 1.0 }
// Open-range habitat, like the Moon base: 30% O2 or more at 0.69 atm or less.
const moon = { id: 'moon_base', o2_min: 30, pressure_atm_max: 0.69 }
// Habitat with no oxygen or pressure value at all.
const blank = { id: 'blank' }

const inv = (o2_min, o2_max, pressure_atm_min = null, pressure_atm_max = null) => ({
  o2_min,
  o2_max,
  pressure_atm_min,
  pressure_atm_max,
})

describe('coversO2, single-value habitat', () => {
  it('is true when the tested range includes the value', () => {
    expect(coversO2(inv(10, 50), iss)).toBe(true)
  })
  it('is true when the tested range is exactly the value', () => {
    expect(coversO2(inv(21, 21), iss)).toBe(true)
  })
  it('is false when the tested range is entirely above', () => {
    expect(coversO2(inv(30, 40), iss)).toBe(false)
  })
  it('is false when only a known min already rules it out', () => {
    expect(coversO2(inv(25, null), iss)).toBe(false)
  })
  it('is null when the max is missing and the min does not rule it out', () => {
    expect(coversO2(inv(15, null), iss)).toBe(null)
  })
  it('is null when both bounds are missing', () => {
    expect(coversO2(inv(null, null), iss)).toBe(null)
  })
})

describe('coversO2, open-range habitat', () => {
  it('is true when the tested range reaches the minimum', () => {
    expect(coversO2(inv(21, 34), moon)).toBe(true)
  })
  it('is true for a range far above the minimum (no upper limit)', () => {
    expect(coversO2(inv(80, 100), moon)).toBe(true)
  })
  it('is false when the tested range is entirely below the minimum', () => {
    expect(coversO2(inv(10, 25), moon)).toBe(false)
  })
  it('is false when only a known max already rules it out', () => {
    expect(coversO2(inv(null, 21), moon)).toBe(false)
  })
  it('is null when the min is missing and the max does not rule it out', () => {
    expect(coversO2(inv(null, 85), moon)).toBe(null)
  })
})

describe('coversPressure', () => {
  it('single value: true when the range includes 1 atm', () => {
    expect(coversPressure(inv(null, null, 0.5, 1.0), iss)).toBe(true)
  })
  it('single value: false when the range is entirely below', () => {
    expect(coversPressure(inv(null, null, 0.25, 0.5), iss)).toBe(false)
  })
  it('open range: true when the range dips under the maximum', () => {
    expect(coversPressure(inv(null, null, 0.56, 1.0), moon)).toBe(true)
  })
  it('open range: false when the range is entirely above the maximum', () => {
    expect(coversPressure(inv(null, null, 1.0, 3.0), moon)).toBe(false)
  })
  it('open range: false when only a known min rules it out', () => {
    expect(coversPressure(inv(null, null, 1.0, null), moon)).toBe(false)
  })
  it('is null when the tested range is not fully stated', () => {
    expect(coversPressure(inv(null, null, null, 1.0), moon)).toBe(null)
  })
})

describe('habitat without values', () => {
  it('coversO2 is null even for a fully stated range', () => {
    expect(coversO2(inv(10, 50), blank)).toBe(null)
  })
  it('coversPressure is null even for a fully stated range', () => {
    expect(coversPressure(inv(null, null, 0.5, 1.0), blank)).toBe(null)
  })
  it('both are null when the habitat itself is null', () => {
    expect(coversO2(inv(10, 50), null)).toBe(null)
    expect(coversPressure(inv(null, null, 0.5, 1.0), null)).toBe(null)
  })
})

describe('rangeText', () => {
  it('shows both bounds', () => {
    expect(rangeText(10, 50, '%')).toBe('10 to 50 %')
  })
  it('shows a single value when min equals max', () => {
    expect(rangeText(21, 21)).toBe('21')
  })
  it('keeps a zero bound', () => {
    expect(rangeText(0, 0)).toBe('0')
  })
  it('shows only a min', () => {
    expect(rangeText(21, null)).toBe('from 21')
  })
  it('shows only a max', () => {
    expect(rangeText(null, 85, '%')).toBe('up to 85 %')
  })
  it('shows unknown when both are null', () => {
    expect(rangeText(null, null)).toBe(UNKNOWN)
  })
})

describe('show', () => {
  it('shows unknown for null and undefined', () => {
    expect(show(null)).toBe(UNKNOWN)
    expect(show(undefined)).toBe(UNKNOWN)
  })
  it('shows unknown for an empty string', () => {
    expect(show('')).toBe(UNKNOWN)
  })
  it('shows unknown for an empty array', () => {
    expect(show([])).toBe(UNKNOWN)
  })
  it('joins arrays with commas', () => {
    expect(show(['methane', 'ethylene'])).toBe('methane, ethylene')
  })
  it('keeps zero as a value', () => {
    expect(show(0)).toBe('0')
  })
})

describe('habitatText', () => {
  it('describes a single-value habitat', () => {
    expect(habitatText(iss)).toBe('21% oxygen, 1 atm')
  })
  it('describes an open-range habitat', () => {
    expect(habitatText(moon)).toBe('30% or more oxygen, 0.69 atm or less')
  })
  it('says unknown parts plainly', () => {
    expect(habitatText(blank)).toBe('oxygen unknown oxygen, pressure unknown')
  })
  it('returns an empty string for no habitat', () => {
    expect(habitatText(null)).toBe('')
  })
})
