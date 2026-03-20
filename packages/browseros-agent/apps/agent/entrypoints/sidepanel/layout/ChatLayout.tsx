import type { FC } from 'react'
import { Outlet } from 'react-router'
import { ChatHeader } from '../index/ChatHeader'
import {
  type ChatSessionOptions,
  ChatSessionProvider,
  useChatSessionContext,
} from './ChatSessionContext'

interface ChatLayoutProps {
  sessionOptions?: ChatSessionOptions
  title?: string
}

const ChatLayoutContent: FC<Pick<ChatLayoutProps, 'title'>> = ({ title }) => {
  const {
    providers,
    selectedProvider,
    handleSelectProvider,
    resetConversation,
    messages,
    isLoading,
  } = useChatSessionContext()

  if (isLoading || !selectedProvider) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <ChatHeader
        selectedProvider={selectedProvider}
        onSelectProvider={handleSelectProvider}
        providers={providers}
        onNewConversation={resetConversation}
        hasMessages={messages.length > 0}
        title={title}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}

export const ChatLayout: FC<ChatLayoutProps> = ({
  sessionOptions,
  title,
}) => {
  return (
    <ChatSessionProvider {...sessionOptions}>
      <ChatLayoutContent title={title} />
    </ChatSessionProvider>
  )
}
