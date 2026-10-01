# Bundled WebAssembly encoders

These files are copied (unmodified except where noted) from the npm packages below so the site can encode
images in the browser without contacting any server.

| Directory | Package | Version | Underlying codec | License |
|-----------|---------|---------|------------------|---------|
| `jpeg/` | [@jsquash/jpeg](https://www.npmjs.com/package/@jsquash/jpeg) | 1.6.0 | MozJPEG / libjpeg-turbo | Apache-2.0 (wrapper), BSD-style / IJG / zlib (codec, see `jpeg/codec/LICENSE.codec.md`) |
| `avif/` | [@jsquash/avif](https://www.npmjs.com/package/@jsquash/avif) | 2.1.1 | libavif / AOM | Apache-2.0 (wrapper), BSD-2-Clause (libavif, AOM) |

Modification: `avif/encode.js` no longer imports `wasm-feature-detect` and always loads the single-thread build
(`avif_enc.js`). The multi-thread build needs `SharedArrayBuffer`, which requires cross-origin isolation headers
that GitHub Pages cannot send.

Only the encoders are included (no decoders); browsers decode JPEG/AVIF natively.
