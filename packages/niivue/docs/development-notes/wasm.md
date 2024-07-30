## Updating WASM

To update the C code under the wasm folder use the following command after navigating to the wasm folder in the src folder of the project. [Emscripten must be installed and activated](https://emscripten.org/docs/getting_started/downloads.html).

<pre><code>
emcc -O2 -s ALLOW_MEMORY_GROWTH -s MAXIMUM_MEMORY=4GB -s WASM=1 -DUSING_WASM -I. core32.c nifti2_wasm.c core.c walloc.c -o ../process-image.wasm --no-entry
</code></pre>
