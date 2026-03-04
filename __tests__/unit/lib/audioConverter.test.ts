import { describe, it, expect } from 'vitest'
import { needsConversion, getSupportedFormats } from '@/lib/audioConverter'

// =========================================================================
// needsConversion
// =========================================================================
describe('needsConversion', () => {
  it('returns false for mp3 files', () => {
    expect(needsConversion('recording.mp3')).toBe(false)
  })

  it('returns false for wav files', () => {
    expect(needsConversion('recording.wav')).toBe(false)
  })

  it('returns true for m4a files', () => {
    expect(needsConversion('recording.m4a')).toBe(true)
  })

  it('returns true for webm files', () => {
    expect(needsConversion('recording.webm')).toBe(true)
  })

  it('returns true for ogg files', () => {
    expect(needsConversion('recording.ogg')).toBe(true)
  })

  it('returns true for wma files', () => {
    expect(needsConversion('recording.wma')).toBe(true)
  })

  it('returns true for mp4 files', () => {
    expect(needsConversion('video.mp4')).toBe(true)
  })

  it('returns true for aac files', () => {
    expect(needsConversion('audio.aac')).toBe(true)
  })

  it('handles files with multiple dots in name', () => {
    expect(needsConversion('my.recording.2024.mp3')).toBe(false)
    expect(needsConversion('my.recording.2024.m4a')).toBe(true)
  })

  it('handles uppercase extensions via toLowerCase', () => {
    expect(needsConversion('recording.MP3')).toBe(false)
    expect(needsConversion('recording.WAV')).toBe(false)
    expect(needsConversion('recording.M4A')).toBe(true)
  })

  it('returns true for unknown extensions', () => {
    expect(needsConversion('recording.flac')).toBe(true)
    expect(needsConversion('recording.xyz')).toBe(true)
  })

  it('returns true for files with no extension', () => {
    expect(needsConversion('recording')).toBe(true)
  })
})

// =========================================================================
// getSupportedFormats
// =========================================================================
describe('getSupportedFormats', () => {
  it('returns the exact list of supported formats', () => {
    const formats = getSupportedFormats()
    expect(formats).toEqual(['mp3', 'wav', 'm4a', 'mp4', 'aac', 'webm', 'ogg', 'wma'])
  })

  it('returns 8 formats', () => {
    expect(getSupportedFormats()).toHaveLength(8)
  })

  it('includes all directly supported formats', () => {
    const formats = getSupportedFormats()
    expect(formats).toContain('mp3')
    expect(formats).toContain('wav')
  })

  it('includes all conversion-required formats', () => {
    const formats = getSupportedFormats()
    expect(formats).toContain('m4a')
    expect(formats).toContain('mp4')
    expect(formats).toContain('aac')
    expect(formats).toContain('webm')
    expect(formats).toContain('ogg')
    expect(formats).toContain('wma')
  })
})
