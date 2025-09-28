import { Component, createSignal, onCleanup, onMount } from "solid-js";
import { ScreenshotOptions, Webcam, getScreenshot, getScreenshotData } from "../components/webcam";
import { musicNotationEncoder } from "@marvin-brouwer/music-notation-encoder";

const videoConstraints = {
	width: 500,
	height: 400,
	facingMode: "environment",
};
const screenshotOptions: ScreenshotOptions = {
	screenshotFormat: 'image/png',
	screenshotQuality: 10,
	imageSmoothing: true
}

const encoder = musicNotationEncoder()

const style = `
.data {
	display: inline-block;
	width: 300px;
	overflow-wrap: anywhere;
}
`
export const Scanner: Component = () => {


	const [webcamRef, setWebcamRef] = createSignal<HTMLVideoElement>();
	const [decodedText, setDecodedText] = createSignal('');
	let interval: NodeJS.Timeout | undefined = undefined

	const capture = async () => {
		const imageSrc = getScreenshot(webcamRef()!,screenshotOptions);
		if (imageSrc === decodedText()) return;
		// TODO actual decode
		setDecodedText(imageSrc ?? '');

		const imageData = getScreenshotData(webcamRef()!)
		if (!imageData) return
		try{
			let result = await encoder.decode(imageData);
			if (result.length) debugger;
			result = result;
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
	})

	return <>
		<style>{style}</style>
		<h2>Scan a code</h2>
		<Webcam audio={false} videoConstraints={videoConstraints} ref={setWebcamRef} />
		<p>&nbsp;</p>
		<p class='data'>{decodedText()}</p>
	</>
}