import { describe, test, expect } from 'vitest';
import { repeat, stringToStream } from '../../test-helpers';
import { createEncoder } from './encoder.mts';



describe('encoder', function () {
  
  test('should encode properly', function () {
    
    // ARRANGE
    const input = stringToStream('hello world')
    const sut = createEncoder(10);

    // ACT
    const enc = sut.encode(input);
    
    // ASSERT
    expect(Array.from(enc)).toEqual([
      104, 101, 108, 108, 111, 32, 119,
      111, 114, 108, 100, 237, 37, 84,
      196, 253, 253, 137, 243, 168, 170
    ]);
  });
  
  test('should work with long input', function () {
    
    const input = stringToStream(repeat(10000, 'a'))
    const sut = createEncoder(10);

    // ACT
    const enc = () => sut.encode(input);
    
    expect(enc).not.toThrow();    
  })
  
});