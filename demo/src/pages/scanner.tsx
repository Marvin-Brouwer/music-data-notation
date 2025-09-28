import { Component, createSignal } from "solid-js";
import { Webcam, getScreenshot } from "../components/webcam";

const videoConstraints = {
	width: 1280,
	height: 720,
	facingMode: "environment",
};
export const Scanner: Component = () => {


	const [webcamRef, setWebcamRef] = createSignal<HTMLVideoElement>()

	//   const capture = () => {
	//     const imageSrc = getScreenshot(webcamRef, videoConstraints);
	//     console.log(imageSrc);
	//   };

	return <>
		<h2>Scan a code</h2>
		<Webcam audio={false} videoConstraints={videoConstraints} ref={setWebcamRef} />
	</>
}