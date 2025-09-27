// ---------------------------------------------------------------
// test/setup-cv.ts
// ---------------------------------------------------------------

let initialized = false;
export function openCV(): Promise<typeof globalThis.cv> {

    return new Promise(async resolve => {
        if (initialized === true) return resolve(globalThis.cv);
        const cv = await import('@techstark/opencv-js');
        await cv.default;

        // @ts-expect-error
        globalThis.cv = cv.default
        resolve(globalThis.cv);

        initialized = true;
    })
}
const cv = await openCV();

export default cv as typeof import('@techstark/opencv-js');