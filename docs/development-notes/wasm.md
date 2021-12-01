## Updating WASM
To update the C code under the wasm folder use the following command after navigating to the root of the project.  [Emscripten must be installed and activated](https://emscripten.org/docs/getting_started/downloads.html).
<pre><code>
emcc -O3 -o src/process-image.wasm src/wasm/process-image.c --no-entry -s TOTAL_MEMORY=67108864
</code></pre>