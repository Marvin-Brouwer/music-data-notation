import { A } from "@solidjs/router";
import { Component } from "solid-js";

export const LandingPage: Component = () => <>
	<h2>Start</h2>
	<p>Select either of these options to use the encoding:</p>
	<ul>
		<li><A href="/edit/">Editor</A></li>
		<li>TODO Scanner</li>
	</ul>
</>