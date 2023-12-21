import React, { useEffect, useRef, useState } from 'react'
import { PhotoProvider, PhotoView } from 'react-photo-view'
import { Message, useChatStore } from 'src/stores/chat'
import 'react-photo-view/dist/react-photo-view.css'
import OpenAIIcon from '../../assets/icons/openai-logomark.svg'
import { User2, Loader, AlertCircle } from 'lucide-react'
import { imageStore } from 'src/lib/image-persist'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'

export const MessageList: React.FC = () => {
  const { messages, fixBrokenMessage } = useChatStore()
  const messageListRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fixBrokenMessage()
  }, [fixBrokenMessage])

  useEffect(() => {
    setTimeout(() => {
      scrollToBottom()
    }, 100)
  }, [messages])

  const scrollToBottom = () => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    }
  }

  return (
    <div className="flex-1 overflow-y-auto" ref={messageListRef} style={{ scrollBehavior: 'smooth' }}>
      <PhotoProvider>
        {messages.map((message, index) => (
          <ChatItem {...message} key={index} />
        ))}
      </PhotoProvider>
    </div>
  )
}

const ChatItem = ({ type, content, isLoading, isError, imageMeta, timestamp }: Message) => {
  const [srcs, setSrcs] = useState(null as null | string[])
  useEffect(() => {
    ;(async () => {
      const keys = content.split('|')
      const images = await Promise.all(
        keys.map((key) => imageStore.retrieveImage(key)).filter(Boolean) as Promise<string>[],
      )
      setSrcs(images.length ? images : null)
    })()
  }, [content])

  return (
    <div className="border-b border-gray-200 p-4 odd:bg-gray-50 last-of-type:border-none">
      <div className="mb-4 flex items-center gap-2">
        {type === 'assistant' ? (
          <>
            <div className="w-6">
              <OpenAIIcon />
            </div>
            DALL·E 3
          </>
        ) : (
          <>
            <User2 />
            You
          </>
        )}
      </div>
      {isLoading ? <Loader className="animate-spin" /> : null}
      {imageMeta && (
        <div className="mb-2 flex text-sm text-zinc-400">
          {imageMeta?.size}, {imageMeta?.quality} quality, {imageMeta?.style} look
        </div>
      )}
      {type === 'user' ? (
        content
      ) : (
        <>
          {isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{content}</AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-wrap gap-2">
              {srcs?.map((src) => (
                <PhotoView src={src} key={src}>
                  <img src={src} className="w-[200px] cursor-pointer md:w-[300px]"></img>
                </PhotoView>
              ))}
            </div>
          )}
        </>
      )}
      {timestamp && (
        <div className="mt-2">
          <span className="text-xs text-zinc-500">{new Date(timestamp).toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}
