import { Howl, Howler } from "howler"

Howler.autoUnlock = true

export const successSound = new Howl({
  src: ["/sounds/preview.m4a"],
  preload: true,
  volume: 0.8,
})

export const failSound = new Howl({
  src: ["/sounds/ceeday-huh-sound-effect.mp3"],
  preload: true,
  volume: 0.8,
})
