import { Component, createMemo } from "solid-js";
import { useSearchParams } from "@solidjs/router";

export const EditForm: Component = () => {

  const [searchParams] = useSearchParams();

  const value = searchParams['text'];

	return <>
		
		<form method="get">
			<input type="text" value={value} placeholder="text to encrypt here" name="text" />
			<button type="submit">Submit</button>
		</form>
	</>
}