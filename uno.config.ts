import { defineConfig, presetWind } from "unocss";
import transformerVariantGroup from '@unocss/transformer-variant-group'

export default defineConfig({
  presets: [presetWind()],
  transformers: [transformerVariantGroup()],
});
