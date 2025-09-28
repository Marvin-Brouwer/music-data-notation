import { useParams } from "@solidjs/router";
import { Component } from "solid-js";

export const Example: Component = () => {

	const { id } = useParams()

	return <>
		<h3>Example: { id }</h3>
		<p>TODO description on how this all works.</p>
		<p>Perhaps just import the markdown.</p>
		<p>Page not found <a href={import.meta.env.BASE_URL}>Back to home</a>.</p>
	</>
}