import { Howl, Howler } from "howler"

Howler.autoUnlock = true

export const successSound = new Howl({
  src: ["/sounds/duolingo-correct.mp3"],
  preload: true,
  volume: 1.0,
  html5: false,
})

export const failSound = new Howl({
  src: ["/sounds/windows-xp-critical-error-full-version.ogg"],
  preload: true,
  volume: 0.8,
  html5: false,
})
