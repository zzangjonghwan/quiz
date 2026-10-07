import { App } from '@capacitor/app'
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { useEffect, useRef } from 'react'
import { playSound } from './sound'
import { getState } from './store'

const isNative = Capacitor.isNativePlatform()
const hapticsOn = () => isNative && getState().settings.haptics

export function hapticTap() {
  if (hapticsOn()) void Haptics.impact({ style: ImpactStyle.Light })
}

export function hapticCorrect() {
  if (hapticsOn()) void Haptics.impact({ style: ImpactStyle.Medium })
}

export function hapticWrong() {
  if (hapticsOn()) void Haptics.notification({ type: NotificationType.Error })
}

/** The heavy "쿠구궁" for a wrong answer in 게임 모드. */
export function hapticCrash() {
  if (!hapticsOn()) return
  void Haptics.impact({ style: ImpactStyle.Heavy })
  setTimeout(() => void Haptics.impact({ style: ImpactStyle.Heavy }), 260)
}

export function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0b0c' : '#f6f6f7')
  // Status bar icons must contrast with the page background.
  if (isNative) void SystemBars.setStyle({ style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light })
}

/**
 * Light vibration on every button press. Buttons that give their own feedback
 * (answer choices) opt out with data-haptic="off".
 */
export function installTapHaptics() {
  document.addEventListener(
    'click',
    (e) => {
      const button = (e.target as Element | null)?.closest('button')
      if (button && !button.disabled && button.dataset.haptic !== 'off') {
        hapticTap()
        playSound('tap')
      }
    },
    true,
  )
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
