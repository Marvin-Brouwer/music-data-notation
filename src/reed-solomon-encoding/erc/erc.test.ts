import { describe, test, expect } from 'vitest';
import ReedSolomon from './erc.mts';
import { sha256 } from 'js-sha256';


const repeat = (amount: number, input: string) => Array.from({ length: amount }, () => input).join('');

describe('RSCodec', function () {
  
  test('should encode/decode properly', function () {
    
    const input = new Uint8Array(sha256.arrayBuffer('hello world'))
    const rs = new ReedSolomon(input.length * 2);
    const enc = rs.encode(input);
    
    expect(enc).toEqual([
      104, 101, 108, 108, 111, 32, 119,
      111, 114, 108, 100, 237, 37, 84,
      196, 253, 253, 137, 243, 168, 170
    ]);
    
    expect(rs.decode(enc)).toEqual(input);
    
  });
  
  test('should correct errors properly', function () {
    
    const input = new Uint8Array(sha256.arrayBuffer(repeat(10, 'hello world')));
    const rs = new ReedSolomon(input.length * 2);
    const enc = rs.encode(input);
    
    // expect(enc).toEqual([
    //   104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 32,
    //   104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 32,
    //   104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 32,
    //   104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 32,
    //   104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 32,
    //   104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 32,
    //   104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 32,
    //   104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 32,
    //   104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 32,
    //   104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 32,
    //   40, 171, 40, 207, 45, 222, 68, 85, 45, 171
    // ]);
    
    expect(rs.decode(enc)).toEqual(input);
    
    const errorLocations = [27, -3, -9, 7, 0];
    
    for (let i = 0; i < errorLocations.length; i++) {
      enc[errorLocations[i]] = 99;
      expect(rs.decode(enc)).toEqual(input);
    }
    
    enc[82] = 99; enc[83] = 99; enc[84] = 99;
  
    expect(function () { rs.decode(enc) }).toThrow();
    
  });
  
  test('should work with long input', function () {
    
    const input = new Uint8Array(sha256.arrayBuffer(repeat(10000, 'a')))
    const rs = new ReedSolomon(input.length * 2);
    const enc = rs.encode(input);
    expect(rs.decode(enc)).toEqual(input);
    enc[177] = 99;
    enc[2212] = 88;
    expect(rs.decode(enc)).toEqual(input);
    
  })
  
});