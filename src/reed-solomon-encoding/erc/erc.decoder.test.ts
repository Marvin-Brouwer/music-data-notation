import { describe, expect, test } from "vitest";
import { ReedSolomonDecoder } from "./erc.decoder.mts";
import { ReedSolomon, Utils } from "./erc-working.mts";
import { streamToString } from './test-helpers';

describe('ReedSolomonDecoder', function () {

    // test('should decode properly', function () {

    //     const input = new Uint8Array([
    //         104, 101, 108, 108, 111, 32, 119,
    //         111, 114, 108, 100, 237, 37, 84,
    //         196, 253, 253, 137, 243, 168, 170
    //     ]);
    //     const rs = new ReedSolomonDecoder(10);
    //     const rsw = new ReedSolomon(10);
    //     const resultOld = rsw.decode(Array.from(input));
    //     const result = rs.decode(input);

    //     expect(resultOld).toEqual('hello world');
    //     expect(streamToString(result)).toEqual('hello world');

    // });

    test('should decode properly', function () {

        const input = new Uint8Array([
            104, 101, 108, 108, 111, 32, 119,
            111, 114, 108, 100, 237, 37, 84,
            196, 253, 253, 137, 243, 168, 170
        ]);
        const rs = new ReedSolomonDecoder(10);
        const rsw = new ReedSolomon(10);
        const resultOld = rsw.codec.correctMsg(Array.from(input), 10);
        const result = rs._correctMsg(input);

        expect(Utils.pack(resultOld).slice(0, 'hello world'.length)).toEqual('hello world');
        expect(streamToString(result).slice(0, 'hello world'.length)).toEqual('hello world');

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

    // describe('forneySyndromes', () => {
    //     test('invalid codeblock, returns some syndromes', function () {

    //         // ARRANGE
    //         const sut = new ReedSolomonDecoder(10);
    //         const sutOld = new ReedSolomon(10);
    //         const syndromes = new Uint8Array([
    //             153, 208, 99, 207, 113, 
    //             203, 42, 184, 97, 139
    //         ]);

    //         // ACT
    //         const result = sut._calcSyndromes(input);
    //         var resultOld = sutOld.codec.forneySyndromes(Array.from(syndromes), [], 21)

    //         // ASSERT
    //         expect(Array.from(result)).toEqual(Array.from([
    //             153, 208, 99, 207, 113, 
    //             203, 42, 184, 97, 139
    //         ]));
    //     });
    // })

    describe('_findErrorLocations', () => {
        test('invalid codeblock, returns some locations', function () {

            // ARRANGE
            const sut = new ReedSolomonDecoder(10);
            const sutOld = new ReedSolomon(10);
            const syndromes = new Uint8Array([
                153, 208, 99, 207, 113,
                203, 42, 184, 97, 139
            ]);

            // ACT
            var resultOld = sutOld.codec.rsFindErrors(syndromes, 21);
            const result = sut._findErrorLocations(syndromes, 21);

            // ASSERT
            expect(Array.from(result)).toEqual(resultOld);
        });
    })

    describe('_correctMsg', () => {
        test('invalid codeblock, corrects message', function () {

            // ARRANGE
            const sut = new ReedSolomonDecoder(10);
            const sutOld = new ReedSolomon(10);
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
            var resultOld = sutOld.codec.correctErrata(msg, syndromes, errorPositions);
            const result = sut._correctErrorValues(msg, syndromes, errorPositions);

            // ASSERT
            expect(Array.from(result)).toEqual(Array.from(resultOld));
        });
    })

});