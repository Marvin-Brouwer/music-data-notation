import type { NoteStruct } from "vexflow";

/** The notes that slide from top to bottom */
const rawNotes = [
    'B/3','C/4','D#/4','E/4','F/4','G#/4','A/4','B/4','C/5','D/5','E/5','F/5','G/5','A/5','B/5'
]

const unchangeableNotes = [
    'X/0',':q ##',':h ##',':8 ##',':16 ##',':32 ##'
]

const valueModifiers = [
    'u', 'd', 'v', 'V'
]

// When tuning standard, this is allowed
export const NOTE_TOKEN_LIST: NoteStruct[] = [
    // For now, have the rest in the middle untill we figure out if we can handle it
    { keys: ["B/4"], duration: "qr" },
    ...rawNotes
        .flatMap(expandNotes)
        .map(notes => ({ keys: notes, duration: 'q' }))

    //.flatMap(applyModifiers)
        // TODO: either flatmap -> timings + xlets or we use timing as decorator
        // .concat(unchangeableNotes)
]

function expandNotes(note: string, index: number, collection: string[]) {
    return [
        [note],
        !collection[index + 2]
            ? undefined 
            : [note, collection[index + 2]],
        !collection[index + 4]
            ? undefined 
            : [note, collection[index + 4]],
        !collection[index + 4]
            ? undefined 
            : [note, collection[index + 2], collection[index + 4]]
    ]
    .filter(Boolean)
}

function applyModifiers(note: string) {

    const [stemNote, position] = note.split('/');
    return valueModifiers
        .map(modifier => `${stemNote}${modifier}/${position}`)
}

/* 
tabstave notation=true tablature=false
notes :8 C/5-1/2-C#/5-2/2 ^4^ | D#/4-1/4 | F/5-1/1 | 1/3-G#/4 | Dn/5-3/2 =|=
text Duplicates

options space=00
tabstave notation=true tablature=false clef=none
notes =|| X/0 X/1 X/2 X/3 X/4 X/5 X/6 X/7 ^8^ $etc$ =|=

options space=40
tabstave notation=true tablature=false 
notes :q B/3 C/4 D/4 E/4 F/4 G/4 A/4 B/4 C/5 D/5 E/5 F/5 G/5 A/5 B/5 =||
text Notelist

options space=00
tabstave notation=true tablature=false clef=none
notes =|| X/0 :q ## :h ## :8 ## :16 ## :32 ## =|=
*/