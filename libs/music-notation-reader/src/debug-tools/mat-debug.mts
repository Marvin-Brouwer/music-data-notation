/**
 * src/debug-tools/mat-debug.mts
 *
 * Debug helpers for OpenCV‑JS `cv.Mat` objects.
 *
 * Exports:
 *   - matToAscii(mat, previewSize?) → string
 *   - convertToGrayScale(src)      → cv.Mat   (grayscale, CV_8UC1)
 *
 * Both helpers are deliberately tiny and type‑safe so you can drop
 * them into any test or debugging session without pulling in extra
 * dependencies.
 */

import { Mat } from '@techstark/opencv-js';
import cv from '../open-cv-bootstrap.mts'; // adjust the relative path if needed

/**
 * Turn a CV_8UC1 Mat into a multiline string where each pixel
 * is shown as "·" (0) or "#" (255).  Useful for quick eyeballing.
 */
function matToAscii(mat: Mat, threshold = 128): string {

    if (mat.type() !== cv.CV_8UC1) {
        throw new Error('matToAscii only works on single‑channel 8‑bit mats');
    }

    const rows = mat.rows;
    const cols = mat.cols;
    const out: string[] = [];

    for (let y = 0; y < rows; y++) {
        let line = '';
        for (let x = 0; x < cols; x++) {
            const v = mat.ucharPtr(y, x)[0];
            line += v >= threshold ? '#' : '·';
        }
        out.push(line);
    }
    return out.join('\n');
}

export function writeImageToConsole(name: string, matOrImage: Mat | ImageData) {
    // Ignore in tests
    if ((globalThis as any).LOG_IMAGES === false) return;
    console.log("MAT [" + name + "]")
    if (matOrImage instanceof cv.Mat) {
        console.log(matToAscii(matOrImage))
        return;
    }
    const newMat = cv.matFromImageData(matOrImage);
    const grayMat = new cv.Mat();   // empty destination matrix
    cv.cvtColor(newMat, grayMat, cv.COLOR_RGBA2GRAY);
    console.log(matToAscii(grayMat))
    newMat.delete();
    grayMat.delete();
}