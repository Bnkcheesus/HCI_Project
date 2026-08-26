import { describe, expect, it } from 'vitest'
import { applyTelexKey, removeDiacritics, telex, vietnameseIncludes } from './telex'

describe('telex tone keys', () => {
  it('accepts the tone at the end of the word', () => {
    expect(telex('sachs')).toBe('sách')
  })

  it('accepts the tone right after the vowel', () => {
    expect(telex('sasch')).toBe('sách')
  })

  it.each([
    ['toans', 'toán'],
    ['hocj', 'học'],
    ['vatj', 'vạt'],
    ['lys', 'lý'],
    ['bais', 'bái'],
    ['nhaf', 'nhà'],
    ['hoir', 'hỏi'],
    ['ngax', 'ngã'],
  ])('%s -> %s', (input, expected) => {
    expect(telex(input)).toBe(expected)
  })

  it('places the tone on the first vowel of an open syllable', () => {
    expect(telex('hoaf')).toBe('hòa')
    expect(telex('cuar')).toBe('của')
  })

  it('places the tone on the last vowel of a closed syllable', () => {
    expect(telex('toans')).toBe('toán')
  })

  it('skips the glide in qu- and gi-', () => {
    expect(telex('giair')).toBe('giải')
    expect(telex('quays')).toBe('quáy')
  })

  it('undoes a tone when the same tone key is typed twice', () => {
    expect(telex('as')).toBe('á')
    expect(telex('ass')).toBe('as')
  })

  it('types the tone letter literally when the word has no vowel', () => {
    expect(telex('ts')).toBe('ts')
  })
})

describe('telex letter modifiers', () => {
  it.each([
    ['aa', 'â'],
    ['ee', 'ê'],
    ['oo', 'ô'],
    ['aw', 'ă'],
    ['ow', 'ơ'],
    ['uw', 'ư'],
    ['dd', 'đ'],
  ])('%s -> %s', (input, expected) => {
    expect(telex(input)).toBe(expected)
  })

  it('turns uo + w into ươ', () => {
    expect(telex('uow')).toBe('ươ')
  })

  it('undoes a doubled modifier', () => {
    expect(telex('aaa')).toBe('aa')
    expect(telex('ddd')).toBe('dd')
  })

  it('combines modifiers and tones', () => {
    expect(telex('dduowngf')).toBe('đường')
    expect(telex('ddaij')).toBe('đại')
    expect(telex('tieengs')).toBe('tiếng')
    expect(telex('vieejt')).toBe('việt')
    expect(telex('vaatj')).toBe('vật')
  })

  it('handles a multi-word query, transforming only the current word', () => {
    expect(telex('ddaij soos')).toBe('đại số')
    expect(telex('giair tichs')).toBe('giải tích')
    expect(telex('vaatj lys')).toBe('vật lý')
  })

  it('preserves uppercase from the shift key', () => {
    expect(telex('DD')).toBe('Đ')
    expect(telex('As')).toBe('Á')
  })
})

describe('applyTelexKey', () => {
  it('appends non-letter keys untouched', () => {
    expect(applyTelexKey('giải', ' ')).toBe('giải ')
    expect(applyTelexKey('toán', '1')).toBe('toán1')
  })
})

describe('diacritic-insensitive matching', () => {
  it('strips tones and đ', () => {
    expect(removeDiacritics('Giải tích')).toBe('Giai tich')
    expect(removeDiacritics('Đại số')).toBe('Dai so')
  })

  it('matches a query typed without tones', () => {
    expect(vietnameseIncludes('Giải tích 1', 'giai tich')).toBe(true)
    expect(vietnameseIncludes('Đại số tuyến tính', 'dai so')).toBe(true)
  })

  it('still matches a query typed with correct tones', () => {
    expect(vietnameseIncludes('Giải tích 1', 'giải')).toBe(true)
  })

  it('rejects a genuine mismatch', () => {
    expect(vietnameseIncludes('Giải tích 1', 'hoa hoc')).toBe(false)
  })
})
