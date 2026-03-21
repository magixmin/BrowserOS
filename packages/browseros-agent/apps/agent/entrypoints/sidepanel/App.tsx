import type { FC } from 'react'
import { HashRouter, Route, Routes } from 'react-router'
import { useI18n } from '@/lib/i18n/useI18n'
import { ChatHistory } from './history/ChatHistory'
import { Chat } from './index/Chat'
import { ChatLayout } from './layout/ChatLayout'

export const App: FC = () => {
  const { t } = useI18n()
  return (
    <HashRouter>
      <Routes>
        <Route element={<ChatLayout />}>
          <Route index element={<Chat />} />
          <Route path="history" element={<ChatHistory />} />
        </Route>
        <Route
          element={
            <ChatLayout
              sessionOptions={{ initialMode: 'lobster' }}
              title={t('route.lobsterTitle')}
            />
          }
        >
          <Route path="lobster" element={<Chat />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
