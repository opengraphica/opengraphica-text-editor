# OpenGraphica Text Editor

This is the rich text editor used in the OpenGraphica graphic design program. It has been separated into its own repository because it may be useful for applications outside of OpenGraphica.

This text editor uses the HTML5 Canvas to render text for easy integration with graphics-centered programs. The rich text source is defined in a similar syntax to [BBCode](https://en.wikipedia.org/wiki/BBCode), however there are slight modifications due to text rendering being more complex than HTML:

| Syntax | Description |
|:-------|:------------|
| [b]bolded text[/b] | **bolded text** |
| [i]italicized text[/i] | *italicized text* |
| [u]underlined text[/u] | __underlined text__ |
| [s]strikethrough text[/s] | ~~strikethrough text~~ |
| [left]left align text[/left] | left align text |
| [right]right align text[/right] | right align text |
| [center]center align text[/center] | center align text |
| [style font="Arial"]font name[/style] | specify font name |
| [style size="30px"]font size[/style] | 30px font size |
| [style fill-color=#FF00FFFF]purple text fill[/style] | text fill color with RGBA hex code |
| [style fill-color="linear-gradient(0deg, #FF00FFFF 10%, #00FF00FF 80%)"]purple to green gradient fill[/style] | text fill color with linear gradient |
| [style stroke-color=#FF00FFFF]purple text stroke[/style] | text stroke color with RGBA hex code |
| [style stroke-width="1px"]stroke width[/style] | specifies width of text stroke |
| [style shadow="0px 0px 10px 0px #000000FF outset"]text shadow[/style] | shadow on text with props in order: h-offset, v-offset, blur, spread, color, inset/outset |
| [style kerning="1px"]text kerning[/style] | kerning between letters |
| [style baseline="5px"]text baseline[/style] | additional space at baseline of letters |

## ALPHA RELEASE

This software is still in alpha state. Features are actively being developed.

- [ ] Text rendering
    - [x] LTR
    - [ ] RTL
    - [x] Bolded
    - [x] Italicized
    - [ ] Underlined
    - [ ] Strikethrough
    - [ ] Left align
    - [ ] Right align
    - [ ] Center align
    - [ ] Justify align
    - [ ] Vertical alignment options (for entire document)
        - [x] Baseline (default)
        - [ ] Meanline
        - [ ] Top
        - [ ] Bottom
        - [ ] Middle
    - [x] Font name
    - [x] Font size
    - [ ] Fill color
        - [x] Solid
        - [ ] Linear gradient
        - [ ] Radial gradient
    - [ ] Stroke color
        - [x] Solid
        - [ ] Linear gradient
        - [ ] Radial gradient
    - [x] Stroke width
    - [ ] Shadow
    - [ ] Kerning
        - [ ] Interpret from font
        - [x] Custom offsets
    - [ ] Baseline offset
    - [ ] Text Wrapping
- [x] Text selection
    - [x] Expand selection
        - [x] Left
        - [x] Right
        - [x] Up
        - [x] Down
    - [x] Respect document bounds
    - [ ] Double click select word
    - [ ] Select all (ctrl + a)
- [ ] Text navigation
    - [ ] Arrow keys
        - [x] Navigate one character at time
        - [x] Shift - select
        - [ ] Ctrl - navigation one word at time
        - [x] Scrolling
    - [x] Home/End keys - line start/end
    - [ ] Mouse/touch
        - [ ] Mouse/touch down place cursor
        - [ ] Mouse/touch move to expand selection
        - [ ] Scrolling
            - [ ] With click/touch
            - [ ] With mouse wheel
- [ ] Text insertion
    - [x] Typing
        - [x] Empty selection
        - [x] Replace selection
    - [x] Pasting (ctrl + v)
    - [ ] Drag and drop
- [ ] Text deletion
    - [x] Backspace key
        - [x] Empty selection - delete previous single character 
        - [x] Delete selection
    - [x] Delete key
        - [x] Empty selection - delete next single character 
        - [x] Delete selection
    - [ ] Cut (ctrl + x)
- [ ] Text buffer
    - [ ] Copy (ctrl + c)
- [ ] Text style toolbar
    - [ ] API to control order/display
    - [ ] Bolded
    - [ ] Italicized
    - [ ] Underlined
    - [ ] Strikethrough
    - [ ] Horizontal alignment
    - [ ] Vertical alignment
    - [ ] Font name
        - [ ] Ability to specify available fonts
        - [ ] Load from Google fonts?
    - [ ] Font size
    - [ ] Fill color
        - [ ] Solid
        - [ ] Linear gradient
        - [ ] Radial gradient
    - [ ] Stroke color
        - [ ] Solid
        - [ ] Linear gradient
        - [ ] Radial gradient
    - [ ] Stroke width
    - [ ] Shadow
    - [ ] Kerning
    - [ ] Baseline offset
- [ ] Color selection widget
    [ ] API to substitute with custom widget
- [ ] Gradient selection widget
    [ ] API to substitute with custom widget
- [ ] Programming API
    - [ ] Constructor
        - [x] Set value
        - [x] Specify selection text/background colors
        - [ ] Specify default styles
        - [x] Padding
        - [ ] Readonly
    - [ ] Set value after initialization
    - [ ] Get value
        - [ ] As BBCode string
        - [ ] As HTML string (as compatible as possible)
    - [ ] Scrolling
    - [ ] Trigger events
        - [ ] Touchstart/mousedown
        - [ ] Touchmove/mousemove
        - [ ] Wheel
    - [ ] Emit events
        - [ ] Input
        - [ ] Change
        - [ ] Focus
        - [ ] Blur
    - [ ] Rendering to separate, remote canvas
- [ ] Accessibility
    - [ ] Research necessary aria attributes
    - [ ] Test with screen readers

## Usage

As a global library on the page:

```
<!DOCTYPE html>
<html>
    <head>
        <link rel="stylesheet" type="text/css" href="dist/opengraphica-text-editor.css">
        <script src="dist/opengraphica-text-editor.js"></script>
    </head>
    <body>
        <script>
            const editor = new OpenGraphicaTextEditor();
            document.body.appendChild(editor.domElement);
            editor.init();
        </script>
    </body>
</html>
```

As an NPM module, assuming you have Webpack and Babel set up:

```
import OpenGraphicaTextEditor from 'opengraphica-text-editor';
import 'opengraphica-text-editor/dist/opengraphica-text-editor.css';

const editor = new OpenGraphicaTextEditor();
document.body.appendChild(editor.domElement);
editor.init();
```

If you want to move the editor to a different place in the DOM, move editor.domElement manually then call `init()` again.

```
document.body.appendChild(editor.domElement);
editor.init();
```

When you're completely done with the editor, destroy it.

```
editor.destroy();
```

### Configuration

The `OpenGraphicaTextEditor` constructor accepts a configuration object, defined as follows:

```
new OpenGraphicaTextEditor({

    // Horizontal padding when the area is not read-only.
    paddingHorizontal: 10,

    // Vertical padding when the area is not read-only.
    paddingVertical: 6,

    // Removes all editing styling and toolbars and displays
    // the text editor as if it were regular text on the document.
    readonly: false,

    // Size of the scrollbar in pixels
    scrollbarSize: 12,

    // Color of the scrollbar thumb (handle) (Hex code)
    scrollbarThumbColor: '#787C7D',

    // Amount of pixel spacing between the scrollbar thumb and track.
    // A higher number means a smaller thumb.
    scrollbarThumbPadding: 2,

    // Style of the end of the scrollbar, 'round' or 'square'.
    scrollbarThumbStyle: 'round',

    // Color of the scrollbar track (background) (Hex code)
    scrollbarTrackColor: '#C3C4C4',

    // Background color for text selection. (Hex code)
    selectionBackgroundColor: '#1C79C4',

    // Text color for text selection. (Hex code)
    selectionTextColor: '#FFFFFF',

    // The initial text that shows inside the editor.
    // This uses the BBCode-like syntax defined above.
    value: 'Text value [b]with syntax defined above[/b].'

});
```