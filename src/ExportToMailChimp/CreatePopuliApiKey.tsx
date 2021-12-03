import { Button, Dialog, DialogContent } from "@mui/material"
import { Form } from "material-ui-pack"
import * as React from "react"
import { useCreatePopuliApiKey } from "./useCreatePopuliApiKey"

interface Props {
  disabled: boolean
  onCreated: (populiApiKey: string) => void
}

export default function CreatePopuliApiKey(props: Props) {
  const [open, setOpen] = React.useState(false)
  const [state, setState] = React.useState({
    username: "",
    password: "",
  })

  const {
    mutateAsync: createPopuliApiKey,
    error,
    isLoading,
  } = useCreatePopuliApiKey()

  function handleSubmit() {
    createPopuliApiKey(state).then((resp) => {
      setOpen(false)
      props.onCreated(resp.response.access_key)
      setState((prev) => ({ ...prev, password: "" }))
    })
  }

  return (
    <>
      <Button
        disabled={props.disabled}
        onClick={() => setOpen(true)}
        variant="text"
      >
        Generate New Populi API Key
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogContent>
          <Form
            busy={isLoading}
            onSubmit={handleSubmit}
            state={state}
            setState={setState}
            error={error?.message}
            submitLabel="Generate API Key"
            onCancel={() => setOpen(false)}
            schema={{
              username: "text",
              password: "password",
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
