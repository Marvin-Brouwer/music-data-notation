import { Component } from "solid-js";

export const NotFoundPage: Component = () => <>
	<p>Page not found <a href={import.meta.env.BASE_URL}>Back to home</a>.</p>
</>