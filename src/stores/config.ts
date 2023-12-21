import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ImageGenerateParams } from 'openai/resources'

type Defined<T> = T extends undefined ? never : T

export type Quality = Defined<ImageGenerateParams['quality']>
export type Style = Defined<ImageGenerateParams['style']>
export type Size = `1024x1024` | `1792x1024` | `1024x1792`
export type Count = `${number}`

type ConfigStore = {
  apiKey: string
  setAPIKey: (key: string) => void

  quality: Quality
  setQuality: (quality: Quality) => void

  style: Style
  setStyle: (style: Style) => void

  size: Size
  setSize: (size: Size) => void

  count: Count
  setCount: (count: Count) => void

  reset: () => void
}

const DEFAULT_CONFIG: Pick<ConfigStore, 'quality' | 'size' | 'style' | 'count'> = {
  quality: 'standard',
  style: 'vivid',
  size: '1024x1024',
  count: '1',
}

export const useConfigStore = create(
  persist<ConfigStore>(
    (set, get) => ({
      ...DEFAULT_CONFIG,
      apiKey: '',
      setAPIKey(key) {
        set({ apiKey: key })
      },
      setQuality(quality) {
        set({ quality })
      },
      setStyle(style) {
        set({ style })
      },
      setSize(size) {
        set({ size })
      },
      setCount(count) {
        set({ count })
      },

      reset() {
        set({ ...DEFAULT_CONFIG })
      },
    }),
    {
      name: 'config-storage',
    },
  ),
)
