## Updating WASM
To update the C code under the wasm folder use the following command.  [Emscripten must be installed](https://emscripten.org/docs/getting_started/downloads.html).
<pre><code>
emcc src/wasm/process-image.c -o src/process-image.js -s EXPORT_NAME=createModule -s EXPORTED_FUNCTIONS='[_ProcessNiftiImage]' -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' --post-js src/wasm/post.js
</code></pre>