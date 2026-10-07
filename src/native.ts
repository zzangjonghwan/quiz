import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { useEffect, useRef } from 'react'

const isNative = Capacitor.isNativePlatform()

export function hapticCorrect() {
  if (isNative) void Haptics.impact({ style: ImpactStyle.Light })
}

export function hapticWrong() {
  if (isNative) void Haptics.notification({ type: NotificationType.Error })
}

// Android back button: the most recently mounted handler wins (dialogs mount after
// their screen). A handler returns false when it has nothing to close, which exits the app.
type BackHandler = () => boolean
const backStack: { current: BackHandler }[] = []

if (isNative) {
  void App.addListener('backButton', () => {
    const top = backStack[backStack.length - 1]
    if (!top || !top.current()) void App.exitApp()
  })
}

export function useBackHandler(handler: BackHandler) {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    const entry = { current: () => ref.current() }
    backStack.push(entry)
    return () => {
      const i = backStack.indexOf(entry)
      if (i >= 0) backStack.splice(i, 1)
    }
  }, [])
}
