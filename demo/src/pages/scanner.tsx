import { Component, createSignal, onCleanup, onMount } from "solid-js";
import { ScreenshotOptions, Webcam, getScreenshot } from "../components/webcam";

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

	const capture = () => {
		const imageSrc = getScreenshot(webcamRef()!,screenshotOptions);
		if (imageSrc === decodedText()) return;
		// TODO actual decode
		setDecodedText(imageSrc ?? '');
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