import { Component } from "solid-js";
import { Display } from '../components/display';

export const Viewer: Component = () => {

	return <>
		<h2>Scan this image</h2>
		<Display />
		<p>TODO: QR code to scanner page</p>
	</>
}