import { Stave, Renderer, BarlineType, Formatter, RenderContext, NoteStruct, StaveNote } from 'vexflow';

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

export function generateStave(linePosition: number, notes: NoteStruct[], backgroundColor: string = 'white') {

    const canvas = Object.assign(document.createElement('canvas'), {
        width: calculateWidth(notes.length),
        height: BAR_HEIGHT
    })

    const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
    renderer.resize(canvas.width, canvas.height);
    const context = renderer.getContext();

    context.setFillStyle(backgroundColor)
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

    generateClefStave(context);
    const errorStave = generateErrorStave(context, linePosition, notes);
    generateDataStave(context, notes, linePosition,  errorStave?.getWidth() ?? 0);

    return canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
}

function generateClefStave(context: RenderContext): Stave {

    const clefStave = new Stave(
        STAVE_MARGIN,
        STAVE_MARGIN_TOP,
        CLEF_STAVE_WIDTH
    );
    clefStave
        .addClef('treble')
        .addTimeSignature('4/4')
        .setEndBarType(BarlineType.NONE)
        .setContext(context);

    clefStave.draw();

    return clefStave;
}

function generateErrorStave(context: RenderContext, linePosition: number, notes: NoteStruct[]) {

    const hasErrorCorrection = linePosition > 0;
    if (!hasErrorCorrection) return undefined;

    const errorStave = new Stave(
        STAVE_MARGIN + CLEF_STAVE_WIDTH,
        STAVE_MARGIN_TOP,
        (NOTE_WIDTH * linePosition) + STAVE_PADDING
    );
    errorStave
        .setBegBarType(BarlineType.NONE)
        .setEndBarType(BarlineType.SINGLE)
        .setContext(context);
        
    errorStave.draw();

    const errorNotes = notes.slice(0, linePosition).map(note => new StaveNote(note));
    Formatter.FormatAndDraw(context, errorStave, errorNotes)

    return errorStave;
}

function generateDataStave(context: RenderContext, notes: NoteStruct[], linePosition: number, errorStaveWidth: number): Stave {
    
    const hasErrorCorrection = linePosition > 0;
    const dataNoteCount = notes.length - linePosition;

    const dataStave = new Stave(
        STAVE_MARGIN + CLEF_STAVE_WIDTH + errorStaveWidth ,
        STAVE_MARGIN_TOP,
        (NOTE_WIDTH * dataNoteCount) 
        + (!hasErrorCorrection ?  STAVE_PADDING : 0)
    );
    dataStave
        .setBegBarType(BarlineType.NONE)
        .setEndBarType(BarlineType.END)
        .setContext(context)
        .draw();

    const dataNotes = 
        hasErrorCorrection
            ? notes.slice(linePosition).map(note => new StaveNote(note))
            : notes.map(note => new StaveNote(note));
    Formatter.FormatAndDraw(context, dataStave, dataNotes)

    return dataStave;
}