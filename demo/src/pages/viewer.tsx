import { Component } from "solid-js";
import { Display } from '../components/display';
import { A } from "@solidjs/router";

export const Viewer: Component = () => {

	return <>
		<h2>Scan this image</h2>
		<Display />
		<p>Open the <A href="/scan/">Scanner</A> on your phone to read this code.</p>
		<p>TODO: QR to Scanner</p>
	</>
}