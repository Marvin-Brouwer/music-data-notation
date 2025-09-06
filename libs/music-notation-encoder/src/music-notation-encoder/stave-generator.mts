import { Stave, Renderer, BarlineType, Formatter, StemmableNote } from 'vexflow';

const CLEF_STAVE_WIDTH = 70;
const STAVE_MARGIN = 15;
const STAVE_MARGIN_TOP = 15;
const STAVE_PADDING = 10;
const NOTE_WIDTH = 30;
const BAR_HEIGHT = 140;
const LINE_WIDTH = 2;

export function calculateWidth(notesLength: number) {

    const noteWidth = NOTE_WIDTH * notesLength + STAVE_PADDING

    return STAVE_MARGIN + CLEF_STAVE_WIDTH
        + noteWidth
        + STAVE_MARGIN

}

export function generateStave(linePosition: number, notes: StemmableNote[], backgroundColor: string = 'white') {

    const canvas = Object.assign(document.createElement('canvas'), {
        width: calculateWidth(notes.length),
        height: BAR_HEIGHT
    })

    const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
    renderer.resize(canvas.width, canvas.height);
    const context = renderer.getContext();

    context.setFillStyle('white')
    context.setLineWidth(LINE_WIDTH);
    context.setStrokeStyle('black');
    context.rect(
        LINE_WIDTH, LINE_WIDTH, 
        canvas.width - (LINE_WIDTH * 2), canvas.height - (LINE_WIDTH * 2)
    );
    context.fill();
    context.stroke();
    context.save();
    context.setFillStyle('black');

    const clefStave = new Stave(
        STAVE_MARGIN,
        STAVE_MARGIN_TOP,
        linePosition > 0
            ? CLEF_STAVE_WIDTH
            : CLEF_STAVE_WIDTH + STAVE_MARGIN);

    const errorStaveWidth = NOTE_WIDTH * linePosition;
    const errorStave = new Stave(
        STAVE_MARGIN + CLEF_STAVE_WIDTH,
        STAVE_MARGIN_TOP,
        errorStaveWidth + STAVE_PADDING);
    const dataStaveWidth = NOTE_WIDTH * (notes.length - linePosition);
    const dataStave = new Stave(
        STAVE_MARGIN + CLEF_STAVE_WIDTH + errorStaveWidth + STAVE_PADDING,
        STAVE_MARGIN_TOP,
        dataStaveWidth);
    // Add a clef and time signature.
    clefStave
        .addClef('treble')
        .addTimeSignature('4/4')
        .setEndBarType(BarlineType.NONE);
    errorStave
        .setBegBarType(BarlineType.NONE);
    dataStave
        .setBegBarType(BarlineType.NONE)
        .setEndBarType(BarlineType.END)

    // Connect it to the rendering context and draw!
    clefStave.setContext(context).draw();
    dataStave.setContext(context).draw();

    function drawErrorStave() {
        const errorNotes = notes.slice(0, linePosition);
        errorStave.setContext(context).draw();
        Formatter.FormatAndDraw(context, errorStave, errorNotes)

    }
    if (linePosition > 0) drawErrorStave();
    const dataNotes = linePosition > 0
        ? notes.slice(linePosition)
        : notes;

    // Format and justify the notes to 400 pixels.
    Formatter.FormatAndDraw(context, dataStave, dataNotes)

    return canvas.toDataURL()
}