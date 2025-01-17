import { ImageGenerateParams } from 'openai/resources'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useConfigStore } from './config'
import OpenAI from 'openai'
import { imageStore } from 'src/lib/image-persist'

export type ImageMeta = Pick<ImageGenerateParams, 'quality' | 'size' | 'style'>

export interface Message {
  type: 'user' | 'assistant'
  content: string
  isError: boolean
  isLoading?: boolean
  imageMeta?: ImageMeta
  timestamp: number
}

type ChatStore = {
  messages: Message[]
  isGenerating: boolean
  inputPrompt: string

  isShowingApiKeyDialog: boolean
  toggleApiKeyDialog: (value: boolean) => any

  isShowingSettingFormSheet: boolean
  toggleSettingFormSheet: (value: boolean) => any

  onInputChange: (message: string) => any
  addMessage: () => any
  fixBrokenMessage: () => any
  clearMessages: () => any
  cancelGeneration: () => any
}

const ERROR_IMG =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/OOjs_UI_icon_error-destructive.svg/1200px-OOjs_UI_icon_error-destructive.svg.png'

let controller: AbortController

async function generateImage(options: ImageGenerateParams, signal: AbortSignal) {
  const openai = new OpenAI({
    apiKey: useConfigStore.getState().apiKey,
    dangerouslyAllowBrowser: true,
  })
  const completion = await openai.images.generate(options, { signal: signal })
  const base64 = completion.data[0].b64_json
  if (!base64) throw new Error('invalid base64')
  const key = await imageStore.storeImage('data:image/png;base64,' + base64)
  return key
}

export const useChatStore = create(
  persist<ChatStore>(
    (set, get) => ({
      messages: [],
      isGenerating: false,
      inputPrompt: '',

      isShowingApiKeyDialog: false,
      toggleApiKeyDialog(value) {
        set({ isShowingApiKeyDialog: value })
      },

      isShowingSettingFormSheet: false,
      toggleSettingFormSheet(value) {
        set({ isShowingSettingFormSheet: value })
      },

      onInputChange(inputPrompt) {
        set(() => ({ inputPrompt }))
      },
      async addMessage() {
        const { count, style, size, apiKey, quality } = useConfigStore.getState()

        if (!apiKey) {
          get().toggleApiKeyDialog(true)
          return
        }

        if (get().isGenerating) return

        set(() => ({
          isGenerating: true,
          messages: [
            ...get().messages,
            { type: 'user', content: get().inputPrompt, isError: false, timestamp: Date.now() },
            { type: 'assistant', content: '', isError: false, isLoading: true, timestamp: Date.now() },
          ],
        }))
        const options: ImageGenerateParams = {
          prompt: get().inputPrompt,
          model: 'dall-e-3',
          n: 1,
          response_format: 'b64_json',
          size: size,
          style: style,
          quality: quality,
        }
        controller = new AbortController()
        const signal = controller.signal
        try {
          const keys = await Promise.all(
            Array.from({ length: Number(count) }, () =>
              generateImage(options, signal).catch((error) => `error:${error}`),
            ),
          )
          const imageMeta: ImageMeta = {
            style: useConfigStore.getState().style,
            size: useConfigStore.getState().size,
            quality: useConfigStore.getState().quality,
          }
          set(() => ({
            messages: [
              ...get().messages.slice(0, -1),
              {
                type: 'assistant',
                content: keys.join('|'),
                imageMeta,
                isError: false,
                timestamp: Date.now(),
              },
            ],
          }))
        } catch (error: any) {
          set(() => ({
            messages: [
              ...get().messages.slice(0, -1),
              {
                type: 'assistant',
                content: error.message || 'Unknown error',
                isError: true,
                timestamp: Date.now(),
              },
            ],
          }))
          console.error(error)
        } finally {
          set(() => ({ isGenerating: false }))
        }
      },
      cancelGeneration() {
        controller?.abort()
        set(() => ({ isGenerating: false }))
      },
      fixBrokenMessage() {
        const lastMessage = get().messages[get().messages.length - 1]
        if (lastMessage?.isLoading) {
          set(() => ({
            messages: get().messages.slice(0, -1),
          }))
        }
      },
      clearMessages() {
        set(() => ({ messages: [] }))
        imageStore.clear()
      },
    }),
    {
      name: 'chat-store',
      //@ts-ignore TODO:
      partialize: (state) => ({ messages: state.messages }),
    },
  ),
)
