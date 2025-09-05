// @ts-expect-error
import FontFaceObserver from 'fontfaceobserver' // eslint-disable-line 7016

class FontFacePolyfill {
    public readonly family: string;
    public readonly source: string;
    public readonly descriptors: FontFaceDescriptors;
    private loaded: FontFace['loaded'] | null = null;

    constructor(
        family: string,
        source: string,
        descriptors?: FontFaceDescriptors
    ) {
        this.family = family;
        this.source = source;
        this.descriptors = descriptors || {};
    }

    public load(): Promise<FontFace> {
        if (this.loaded) return this.loaded;

        const style = document.createElement("style");
        style.type = "text/css";

        const descriptors = this.descriptors
        // Handle `url(...)` or raw base64 font data
        const fontFaceRule = "@font-face { " +
            "font-family: '" + this.family + "';" +
            "src: " + this.source + ";" +
            Object.keys(this.descriptors).map(function (k) {
                return k + ":" + descriptors[k as keyof FontFaceDescriptors] + ";";
            }, this).join(" ") +
            "}";

        style.appendChild(document.createTextNode(fontFaceRule));
        document.head.appendChild(style);

        const observer = new FontFaceObserver(this.family);
        this.loaded = observer.load(null, Number.POSITIVE_INFINITY) as Promise<FontFace>;

        return this.loaded;
    };
}

export default window.FontFace ? window.FontFace as unknown as typeof FontFacePolyfill : FontFacePolyfill