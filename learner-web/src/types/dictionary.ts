export const EWordResponseStatus = {
  READY: "READY",
  FALLBACK: "FALLBACK",
  PROCESSING: "PROCESSING",
  FAILED: "FAILED",
} as const

export type TWordResponseStatus =
  (typeof EWordResponseStatus)[keyof typeof EWordResponseStatus]

export interface IWordData {
  word: string
  pos: string

  phonetics: {
    uk: string
    ukAudioUrl: string
    us: string
    usAudioUrl: string
  }

  definitions: Array<{
    definition: string
    meaningVi: string
    example: string
  }>

  summaryVi: string
  cefrLevel: string

  status: TWordResponseStatus

  isPlaceholder: boolean
  message: string
}