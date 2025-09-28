import { Component, createSignal, onCleanup, onMount } from "solid-js";
import { Webcam, getScreenshotData } from "../components/webcam";
import { musicNotationEncoder } from "@marvin-brouwer/music-notation-encoder";

const videoConstraints: MediaStreamConstraints["video"] = {
	width: 200,
	height: 400,
	noiseSuppression: true,
	facingMode: "environment"
};

const encoder = musicNotationEncoder()

const style = `
.data {
	display: block;
	width: 300px;
	overflow-wrap: break-word;
}
`
export const Scanner: Component = () => {


	const [webcamRef, setWebcamRef] = createSignal<HTMLVideoElement>();
	const [previousFrame, setPreviousFrame] = createSignal<ImageData>();
	const [decodedText, setDecodedText] = createSignal('');
	let interval: NodeJS.Timeout | undefined = undefined

	const capture = async () => {

		const imageData = getScreenshotData(webcamRef()!)
		if (!imageData) return
		if (imageData === previousFrame()) return;
		setPreviousFrame(imageData);

		try{
			let result = await encoder.decode(imageData);
			if (!result.length) return;
			// if (!result[0].clef) return;
			// Only single line supported for now
			// if (!result.every(r => r.clef === result[0].clef)) return;

			setDecodedText(JSON.stringify(result, undefined, 2));
		} catch (e){
			console.error(e)
		}
	};

	onMount(() => {
		interval = setInterval(capture, 100);
	})
	onCleanup(() => {
		clearInterval(interval);
		interval = undefined;
		webcamRef()?.pause();
		webcamRef()?.remove()
	})

	return <>
		<style>{style}</style>
		<h2>Scan a code</h2>
		<Webcam audio={false} videoConstraints={videoConstraints} ref={setWebcamRef} />
		<p>&nbsp;</p>
		<pre class='data'>{decodedText()}</pre>
	</>
}