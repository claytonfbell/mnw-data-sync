import { lighten, LinearProgress, Typography, useTheme } from "@mui/material"
import Box from "@mui/material/Box"
import "github-markdown-css"
import { Form, Spacer } from "material-ui-pack"
import moment from "moment"
import Pusher from "pusher-js"
import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import { config } from "../config/config"
import CreatePopuliApiKey from "./CreatePopuliApiKey"
import { LogMessage } from "./models/LogMessage"
import { Progress } from "./models/Progress"
import { useExportToMailChimp } from "./useExportToMailChimp"
import { useExportToMailChimpState } from "./useExportToMailChimpState"

export function ExportToMailChimp() {
  const theme = useTheme()
  const { state, setState } = useExportToMailChimpState()

  const {
    mutateAsync: exportToMailchimp,
    error,
    isLoading,
  } = useExportToMailChimp()

  function handeleSubmit() {
    setLogs([])
    setProgress(undefined)
    if (state !== undefined) {
      exportToMailchimp(state).then(() => {
        setState({
          ...state,
          queryUpdatesAfter: moment().toISOString(),
        })
      })
    }
  }

  const [logs, setLogs] = useState<LogMessage[]>([])
  const [progress, setProgress] = useState<Progress>()

  useEffect(() => {
    Pusher.logToConsole = process.env.NODE_ENV === "development"
    const pusher = new Pusher("6b5fb4afec353670c57c", {
      cluster: "us3",
    })
    const channel = pusher.subscribe(config.pusher.channel)
    function logHandler(data: LogMessage) {
      setLogs((prev) =>
        [...prev, data].sort((a, b) => a.messageId - b.messageId)
      )
    }
    function progressHandler(data: Progress) {
      setProgress((prev) => {
        if (prev !== undefined && prev.progressId > data.progressId) {
          return prev
        }
        return data
      })
    }
    channel.bind("log", logHandler)
    channel.bind("progress", progressHandler)

    // cleanup when component unmounts
    return () => {
      pusher.unsubscribe(config.pusher.channel)
      channel.unbind("log", logHandler)
      channel.unbind("progress", progressHandler)
    }
  }, [])

  return (
    <>
      <Typography style={{ color: theme.palette.secondary.main }} variant="h1">
        Export from Populi to MailChimp
      </Typography>
      <Spacer />
      <CreatePopuliApiKey
        disabled={isLoading}
        onCreated={(populiApiKey) =>
          setState((prev) => ({ ...prev, populiApiKey }))
        }
      />
      <Spacer />

      <Form
        state={state}
        setState={setState}
        submitLabel="Start Sync"
        onSubmit={handeleSubmit}
        busy={isLoading}
        error={error?.message}
        schema={{
          populiApiKey: {
            type: "password",
            autoComplete: "off",
            label: "Populi API Key",
          },
          mailChimpApiKey: {
            type: "password",
            autoComplete: "off",
            label: "MailChimp API Key",
          },
          mailChimpListId: {
            type: "text",
            label: "MailChimp List ID",
          },
          queryUpdatesAfter: "dateTime",
          skip: { type: "number", setZeroToNull: false },
        }}
        layout={{
          mailChimpApiKey: { xs: 12, sm: 6, md: 6, lg: 5 },
          mailChimpListId: { xs: 12, sm: 6, md: 6, lg: 3 },
          queryUpdatesAfter: { xs: 12, sm: 6, md: 4, lg: 3 },
          skip: { xs: 12, sm: 3, lg: 1 },
          submitButton: { xs: 12, sm: 3, lg: 2 },
        }}
      />

      <Spacer />
      {progress !== undefined && progress.value > 0 ? (
        <LinearProgress value={progress.value} variant="determinate" />
      ) : null}

      <Spacer />
      {logs
        .filter((x) => x.level !== "debug")
        .map((logMessage, index) => {
          return (
            <Box
              key={index}
              sx={{
                color: logMessage.level === "error" ? "red" : undefined,
                opacity: logMessage.level === "debug" ? 0.3 : 1,
                "& code": {
                  backgroundColor: lighten(theme.palette.secondary.main, 0.5),
                  paddingLeft: 1,
                  paddingRight: 1,
                  paddingTop: `3px`,
                  paddingBottom: `3px`,
                  borderRadius: `3px`,
                },
              }}
            >
              <ReactMarkdown>{logMessage.message}</ReactMarkdown>
            </Box>
          )
        })}
    </>
  )
}
