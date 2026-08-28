# Vocabulary data sources and licenses

This directory contains a generated, merged vocabulary dataset. The generated records preserve the source-list name and rank for attribution and traceability.

## New General Service List Project word lists

The following lists are used in full:

- **New General Service List 1.2 (NGSL)** — 2,809 records
  - Authors: Charles Browne, Brent Culligan, Joseph Phillips
  - Source: <https://www.newgeneralservicelist.com/new-general-service-list>
- **New Academic Word List 1.2 (NAWL)** — 957 records
  - Authors: Charles Browne, Brent Culligan, Joseph Phillips
  - Source: <https://www.newgeneralservicelist.com/new-academic-word-list>
- **TOEIC Service List 1.2 (TSL)** — 1,250 records
  - Authors: Charles Browne, Brent Culligan
  - Source: <https://www.newgeneralservicelist.com/toeic-service-list>

The NGSL Project publishes these word lists under the **Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0)**:
<https://creativecommons.org/licenses/by-sa/4.0/>

The merged vocabulary dataset and modifications to these list records are distributed under the same CC BY-SA 4.0 terms. Manually supplied English definitions for a small number of mismatched records are also released under CC BY-SA 4.0 as part of the merged dataset.

## ECDICT

Chinese translations, phonetic transcriptions, and part-of-speech metadata are derived from:

- **ECDICT — Free English to Chinese Dictionary Database**
- Project: <https://github.com/skywind3000/ECDICT>
- Copyright © 2025 Linwei
- License: MIT

Simplified Chinese text was mechanically converted to Taiwan Traditional Chinese with OpenCC's `s2twp` conversion profile. Users should treat these translations as study aids and may add a personal note when a sense needs correction or clarification.

### MIT License

Copyright (c) 2025 Linwei

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## OpenCC

Traditional Chinese conversion was performed with OpenCC:
<https://github.com/BYVoid/OpenCC>

OpenCC is licensed under the Apache License 2.0. OpenCC code or dictionary files are not bundled into the published vocabulary trainer; only the generated converted text is included.

## Exam names and test materials

This application does not contain, reproduce, or claim to contain official IELTS, TOEFL, or TOEIC test questions or official exam audio.

TOEFL and TOEIC are registered trademarks of Educational Testing Service (ETS). IELTS is a registered trademark of the IELTS Partners. This independent application is not endorsed or approved by ETS or the IELTS Partners. Exam names are used only to describe the intended study categories of the open vocabulary lists.

## Kokoro local text-to-speech

The optional high-quality pronunciation mode loads these components at runtime:

- **Kokoro-82M** by hexgrad — Apache License 2.0
  <https://huggingface.co/hexgrad/Kokoro-82M>
- **Kokoro-82M v1.0 ONNX** by the ONNX Community — Apache License 2.0
  <https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX>
- **kokoro-js 1.2.1** — Apache License 2.0
  <https://www.npmjs.com/package/kokoro-js>
- **Transformers.js**, included in the kokoro-js browser distribution — Apache License 2.0
  <https://github.com/huggingface/transformers.js>

The application pins the kokoro-js browser distribution to version 1.2.1. The q8 ONNX model and selected voice data are downloaded from Hugging Face only after the user requests high-quality pronunciation. They are processed locally and may be stored in browser-managed caches. No Azure account, API key, metered speech service, official exam audio, or third-party pronunciation recording is included.

Apache License 2.0: <https://www.apache.org/licenses/LICENSE-2.0>

## Browser and operating-system pronunciation fallback

Pronunciation playback uses the browser Web Speech API and a voice supplied by the user's browser or operating system. The interface displays the selected voice's name, language, and `localService` status when the browser exposes them. A non-local browser voice may require a network service. No third-party pronunciation recording is stored in this repository.

## Font Awesome Free

Interface icons are provided by **Font Awesome Free 7.2.0**:
<https://github.com/FortAwesome/Font-Awesome>

- Icons: Creative Commons Attribution 4.0 International (CC BY 4.0)
- Fonts: SIL Open Font License 1.1
- Code: MIT License

The complete upstream license text is bundled at `vendor/fontawesome/LICENSE.txt`.
