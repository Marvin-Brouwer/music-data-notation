import { loadFont, patchCanvas } from '@marvin-brouwer/tools';

patchCanvas();
await loadFont(require.resolve('vexflow-fonts/package.json'), './bravura/Bravura_1.392.woff2');
