import Head from "next/head"
import { Application } from "../src/Application"

export default function Home() {
  return (
    <>
      <Head>
        <title>MNW Data Sync</title>
      </Head>
      <Application />
    </>
  )
}
