import {
  AppBar,
  Container,
  createTheme,
  CssBaseline,
  NoSsr,
  Tab,
  Tabs,
  ThemeProvider,
} from "@mui/material"
import * as React from "react"
import { QueryClient, QueryClientProvider } from "react-query"
import { ExportToMailChimp } from "./ExportToMailChimp/ExportToMailChimp"
import rest from "./ExportToMailChimp/rest"

rest.setBaseURL("/api")
const queryClient = new QueryClient()

const theme = createTheme({
  palette: {
    primary: {
      main: "#7c655c",
    },
    secondary: { main: "#e68668" },
    background: {
      default: "#fcf9ec",
      paper: "#ffffff",
    },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        h1: {
          fontSize: 36,
        },
      },
    },
  },
})

type TabKeys = "exportToMailchimp" | "changelog"

export function Application() {
  const [selected, setSelected] = React.useState<TabKeys>("exportToMailchimp")

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppBar>
          <Tabs
            textColor="inherit"
            indicatorColor="secondary"
            value={selected}
            onChange={(e, i) => setSelected(i)}
          >
            <Tab value="exportToMailchimp" label="MailChimp" />
          </Tabs>
        </AppBar>
        <Container style={{ marginTop: 72 }}>
          {selected === "exportToMailchimp" && (
            <NoSsr>
              <ExportToMailChimp />
            </NoSsr>
          )}
        </Container>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
