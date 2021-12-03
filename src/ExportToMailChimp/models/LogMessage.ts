export interface LogMessage {
  messageId: number
  message: string
  level: LogLevel
}

export type LogLevel = "info" | "debug" | "error"
