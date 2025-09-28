import { Component, createMemo } from 'solid-js';
import { useSearchParams } from "@solidjs/router";
import { routeBase } from '@quick-vite/gh-pages-spa/solidjs'

const style = `
form {
	display: flex;
    flex-direction: column;
    align-content: center;
    justify-content: flex-start;
    align-items: stretch;
	width: 750px;
}
`;

export const EditForm: Component = () => {

	const [searchParams, setSearchParams] = useSearchParams();
	const value = createMemo(() => searchParams['text'] as string ?? '', [searchParams]);

	return <>
		<style>{style}</style>
		<form method="get">
			<textarea value={value()} placeholder="text to encrypt here" name="text"
				onChange={e => setSearchParams({
					[e.target.name]: e.target.value
				})}
				onInput={e => setSearchParams({
					[e.target.name]: e.target.value
				})}
			/>
			<button type="button" disabled={value().length === 0} onclick={(e) => share(e, value())}>Share</button>
		</form>
	</>
}

async function share(_e: MouseEvent, text: string) {
	const shareData = {
		title: "Scan this code",
		text: "I've encoded a message into some musical notes",
		url: `${window.location.origin}/${routeBase()}/view/?text=${encodeURIComponent(text)}`,
	};


	try {
		await navigator.share(shareData);
	} catch (err) {
		console.error(err)
	}
}