The Poem.png font validates [PR1567](https://github.com/niivue/niivue/pull/1567) to demonstrate support for non-Latin characters without generating huge files. The goal is to write `麻雀虽小` which translates to `The sparrow is small`, reflecting a minimal showcase for supporting any typeface.

The typeface can be regenerated with [msdfgen](https://github.com/chlumsky/msdfgen) using the open source [Noto Sans Simplified Chinese](https://fonts.google.com/noto/specimen/Noto+Sans+SC?preview.script=Hans):

```
.\msdf-atlas-gen.exe -font NotoSansSC-Regular.ttf -charset poem.txt -pxrange 2 -dimensions 512 256 -format png -json Poem.json -imageout Poem.png
```
The file `poem.txt` should have these characters:

```
"\"\\ ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890!`?'.,;:()[]{}<>|/@^$-%+=#_&~*天地玄黄麻雀虽小"
```