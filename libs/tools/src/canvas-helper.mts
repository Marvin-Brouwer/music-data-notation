import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

export function patchCanvas() {
    console.log('Patching canvas to use @napi-rs/canvas')
    const CanvasImpl = createCanvas(1, 1).constructor;
    (globalThis as any).HTMLCanvasElement = CanvasImpl;
    window.HTMLCanvasElement = CanvasImpl as any;
    const original = document.createElement;
    document.createElement = (type: string) => {
        if (type !== 'canvas') return original(type);
        return createCanvas(1, 1) as unknown as HTMLCanvasElement;
    }
}

export async function loadFont(packageJsonPath: string, fontPath: string) {
    const basePackageDir = dirname(packageJsonPath.replace('file:///', ''))
    const fullFontPath = resolve(basePackageDir, fontPath);
    console.log('RegisteringFont', fullFontPath)
    GlobalFonts.register(await readFile(fullFontPath))
}