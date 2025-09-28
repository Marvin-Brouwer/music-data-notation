import { Component, createMemo } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { musicNotationEncoder } from '@marvin-brouwer/music-notation-encoder'
import { isError } from "../../../libs/named-error/src/named-error.mts";

const encoder = musicNotationEncoder()

export const Display: Component = () => {

	const [searchParams] = useSearchParams();
	const textValue = createMemo(() => searchParams['text'] as string ?? '', [searchParams]);
	const encodedValue = createMemo(() => encoder.encode(textValue()), [searchParams])

	return <>
		<p>{renderImage(encodedValue())}</p>
	</>
}

// TODO figure out why the image doesn't come out the same as the tests?
// Or maybe just use SVG instead
function renderImage(data: ImageData | Error) {
	if (isError(data)) return <span>{data.message}</span>;

	const canvas = document.createElement("canvas");
	canvas.width = data.width;
	canvas.height = data.height;
	const ctx = canvas.getContext("2d")!;
	ctx.putImageData(data, 0, 0);

	const image = document.createElement("img");
	image.src = canvas.toDataURL("image/png");
	image.width = data.width;
	image.height = data.height;

	return <>{image}</>
}