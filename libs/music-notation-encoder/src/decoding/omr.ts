// function log(msg) { console.log(msg) }
// // src/omr.ts
// import '@pyodide/pyodide';
// import type { LoadOptions, PyodideInterface } from '@pyodide/pyodide';

// // Cache the loaded interpreter so we initialise only once per test run
// let pyodidePromise: Promise<PyodideInterface> | null = null;

// // ---------------------------------------------------------------------
// // 1️⃣ Load Pyodide + required wheels (NumPy, OpenCV‑headless, Pillow)
// async function initPyodide() {
//   log('⏳ Loading Pyodide …');
//   const pyodide = await loadPyodide({
//     // you can point to a custom CDN if you like; default is jsdelivr
//     indexURL : "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
//   });

//   // Load the heavy‑weight scientific packages (they are already compiled)
//   await pyodide.loadPackage(['numpy', 'opencv-python-headless', 'pillow']);
//   log('✅ Pyodide ready');
//   return pyodide;
// }

// // ---------------------------------------------------------------------
// // 2️⃣ Pull the omrmarkengine source code from GitHub and write it into
// //    Pyodide’s virtual filesystem.
// async function loadOmrEngine(pyodide) {
//   const url = 'https://raw.githubusercontent.com/MohawkMEDIC/omrmarkengine/main/omr.py';
//   log(`📥 Fetching omrmarkengine source from ${url}`);
//   const source = await fetch(url).then(r => r.text());

//   // Write the file to the in‑memory FS so Python can import it
//   pyodide.FS.writeFile('/omr.py', source);
//   log('✅ Source written to /omr.py');

//   // Import the module inside the interpreter
//   await pyodide.runPythonAsync(`
//     import importlib.util, sys
//     spec = importlib.util.spec_from_file_location("omr", "/omr.py")
//     omr = importlib.util.module_from_spec(spec)
//     sys.modules["omr"] = omr
//     spec.loader.exec_module(omr)
//   `);
//   log('✅ omr module imported');
// }

// // ---------------------------------------------------------------------
// // 3️⃣ Helper: turn an ImageData → MusicXML using the Python function.
// //    The omrmarkengine repo exposes a function called `process_image`
// //    that expects a **grayscale uint8** NumPy array and returns a string.
// async function imageDataToMusicXML(pyodide, imgData) {
//   // Convert the RGBA Uint8ClampedArray into a Python bytes object
//   const pyBuf = pyodide.toPy(imgData.data);

//   // Run a short Python snippet that:
//   //   • reshapes the flat buffer into (H,W,4)
//   //   • converts to grayscale (standard luminance formula)
//   //   • calls omr.process_image(gray)
//   const xml = await pyodide.runPythonAsync(`
//     import numpy as np, omr
//     # reshape flat RGBA buffer into H×W×4 ndarray
//     arr = np.frombuffer(${pyBuf}.tobytes(), dtype=np.uint8)
//     arr = arr.reshape((${imgData.height}, ${imgData.width}, 4))

//     # Convert to 8‑bit grayscale (ignore alpha)
//     gray = np.dot(arr[...,:3], [0.2989, 0.5870, 0.1140]).astype(np.uint8)

//     # Call the repo’s entry point – adjust if the function name differs
//     music_xml = omr.process_image(gray)   # ← returns a string
//     music_xml
//   `);
//   return xml;   // a plain JavaScript string containing MusicXML
// }

// export async function imageDataToXML(imgData: ImageData) {

//   const pyodide = await initPyodide();
//   await loadOmrEngine(pyodide);
//     const xml = await imageDataToMusicXML(pyodide, imgData);
//     return xml;
// }

// // // ---------------------------------------------------------------------
// // // 4️⃣ Set up webcam → capture → process pipeline
// // async function main() {
// //   const pyodide = await initPyodide();
// //   await loadOmrEngine(pyodide);

// //   // ---- webcam -------------------------------------------------------
// //   const video = document.getElementById('cam');
// //   const stream = await navigator.mediaDevices.getUserMedia({video:true});
// //   video.srcObject = stream;

// //   // ---- capture button ------------------------------------------------
// //   document.getElementById('snap').onclick = async () => {
// //     // draw current video frame onto an off‑screen canvas
// //     const canvas = document.createElement('canvas');
// //     canvas.width  = video.videoWidth;
// //     canvas.height = video.videoHeight;
// //     const ctx = canvas.getContext('2d');
// //     ctx.drawImage(video, 0, 0);

// //     const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
// //     log('📸 Frame captured – sending to OMR …');

// //     try {
// //       const xml = await imageDataToMusicXML(pyodide, imgData);
// //       log('🗒️ Received MusicXML (truncated):\n' + xml.slice(0, 500) + '…');

// //       // ---- OPTIONAL: turn MusicXML into a VexFlow Score object --------
// //       // (you need to have VexFlow loaded in the page; see note below)
// //       if (window.Vex && Vex.Flow && Vex.Flow.MusicXMLParser) {
// //         const parser = new Vex.Flow.MusicXMLParser();
// //         const vfScore = parser.parse(xml);
// //         log('✅ VexFlow Score object created – you can store it, send it to a server, etc.');
// //         // Example: console.log(vfScore);
// //       }
// //     } catch (e) {
// //       log('❌ OMR failed: ' + e);
// //     }
// //   };
// // }

// // main();