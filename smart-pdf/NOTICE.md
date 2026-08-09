# Smart PDF runtime and model notice

Web Terrarium Smart PDF packages two independently licensed open components into a user-generated PDF artifact.

## llama.cpp runtime

- Project: `ggml-org/llama.cpp`
- Pin: tag `b9637`, commit prefix `aedb2a5`
- License: MIT
- Build: Emscripten 4.0.10, JavaScript-only (`-sWASM=0`), single-file runtime
- Source: official upstream repository

The generated runtime is rebuilt from the pinned upstream source by the repository workflow. Its SHA-256 and byte length are recorded in `public/smart-pdf/runtime-manifest.json` when the production artifact is committed.

## Embedded local model

- Model: `HuggingFaceTB/SmolLM2-135M-Instruct`
- GGUF conversion: `bartowski/SmolLM2-135M-Instruct-GGUF`
- File: `SmolLM2-135M-Instruct-Q2_K.gguf`
- Quantization: Q2_K
- License: Apache-2.0
- Expected SHA-256: `741ad12b64088fedc17c33aacb22e48be1972ef36a39f03666dd68bd15614fb9`
- Approximate model bytes: 88.2 MB

The model is not stored in this Git repository. When a user explicitly selects **Smart PDF**, the browser downloads the pinned GGUF from Hugging Face, verifies its SHA-256 using WebCrypto, and only then packages it into the generated PDF.

## Provenance and implementation policy

The `llm.pdf` project inspired the product concept, but Web Terrarium does not copy its source code or PDF template. The Smart PDF packaging/runtime implementation in this repository is independently authored and uses upstream `llama.cpp` plus the openly licensed model listed above.

## Security boundary

Smart PDF contains no Clerk keys, crawler credentials, AI Gateway credentials, Cloudflare Worker tokens, session cookies, or filesystem bridge. The model receives only evidence already frozen inside the exported LivingDocument artifact.
