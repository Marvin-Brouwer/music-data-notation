import { describe, expect, test } from "vitest";
import { ReedSolomonDecoder } from "./erc.decoder.mts";
import { streamToString } from './test-helpers';

describe('decoder', function () {

    describe('decode', () => {
        test('should decode properly', function () {

            // ARRANGE
            const input = new Uint8Array([
                104, 101, 108, 108, 111, 32, 119,
                111, 114, 108, 100, 237, 37, 84,
                196, 253, 253, 137, 243, 168, 170
            ]);
            const sut = new ReedSolomonDecoder(10);

            // ACT
            const result = sut.decode(input);

            // ASSERT
            expect(streamToString(result)).toEqual('hello world');

        });
        test('should correct properly', function () {

            // ARRANGE
            const invalid = 0xFF;
            const input = new Uint8Array([
                104, 101, 108, 108, 111, 32, 119,
                111, 114, 108, invalid, 237, 37, 84,
                196, invalid, 253, 137, 243, 168, 170
            ]);
            const sut = new ReedSolomonDecoder(10);

            // ACT
            const result = sut.decode(input);

            // ASSERT
            expect(streamToString(result)).toEqual('hello world');

        });
    });

    describe('_correctMsg', () => {
        test('should decode properly', function () {

            // ARRANGE
            const invalid = 0xFF;
            const input = new Uint8Array([
                104, 101, 108, 108, 111, 32, 119,
                111, 114, 108, invalid, 237, 37, 84,
                196, invalid, 253, 137, 243, 168, 170
            ]);
            const sut = new ReedSolomonDecoder(10);

            // ACT
            const result = sut._correctMsg(input);

            // ASSERT
            expect(streamToString(result).slice(0, 'hello world'.length)).toEqual('hello world');

        });

        test('should correct properly', function () {

            // ARRANGE
            const invalid = 0xFF;
            const input = new Uint8Array([
                104, 101, 108, 108, 111, 32, 119,
                111, 114, 108, invalid, 237, 37, 84,
                196, invalid, 253, 137, 243, 168, 170
            ]);
            const sut = new ReedSolomonDecoder(10);

            // ACT
            const result = sut._correctMsg(input);

            // ASSERT
            expect(streamToString(result).slice(0, 'hello world'.length)).toEqual('hello world');

        });
    });

    describe('calcSyndromes', () => {
        test('valid codeblock, returns no syndromes', function () {

            // ARRANGE
            const sut = new ReedSolomonDecoder(10);
            const input = new Uint8Array([
                104, 101, 108, 108, 111, 32, 119,
                111, 114, 108, 100, 237, 37, 84,
                196, 253, 253, 137, 243, 168, 170
            ]);

            // ACT
            const result = sut._calcSyndromes(input);

            // ASSERT
            expect(Array.from(result)).toEqual(Array.from([
                0, 0, 0, 0, 0,
                0, 0, 0, 0, 0
            ]));

        });
        test('invalid codeblock, returns some syndromes', function () {

            // ARRANGE
            const sut = new ReedSolomonDecoder(10);
            const invalid = 0xFF;
            const input = new Uint8Array([
                104, 101, 108, 108, 111, 32, 119,
                111, 114, 108, invalid, 237, 37, 84,
                196, invalid, 253, 137, 243, 168, 170
            ]);

            // ACT
            const result = sut._calcSyndromes(input);

            // ASSERT
            expect(Array.from(result)).toEqual(Array.from([
                153, 208, 99, 207, 113,
                203, 42, 184, 97, 139
            ]));
        });
    });

    describe('_findErrorLocations', () => {
        test('invalid codeblock, returns some locations', function () {

            // ARRANGE
            const sut = new ReedSolomonDecoder(10);
            const syndromes = new Uint8Array([
                153, 208, 99, 207, 113,
                203, 42, 184, 97, 139
            ]);

            // ACT
            const result = sut._findErrorLocations(syndromes, 21);

            // ASSERT
            expect(Array.from(result)).toEqual([15, 10]);
        });
    })

    describe('_correctMsg', () => {
        test('invalid codeblock, corrects message', function () {

            // ARRANGE
            const sut = new ReedSolomonDecoder(10);
            const msg = new Uint8Array([
                104, 101, 108, 108, 111, 32,
                119, 111, 114, 108, 255, 237,
                37, 84, 196, 255, 253, 137,
                243, 168, 170
            ]);
            const syndromes = new Uint8Array([
                153, 208, 99, 207,
                113, 203, 42, 184,
                97, 139
            ])
            const errorPositions = [15, 10];

            // ACT
            const result = sut._correctErrorValues(msg, syndromes, errorPositions);

            // ASSERT
            expect(Array.from(result)).toEqual([
                104, 101, 108, 108, 111,
                32, 119, 111, 114, 108,
                100, 237, 37, 84, 196,
                253, 253, 137, 243, 168, 170
            ]);
        });
    })

});