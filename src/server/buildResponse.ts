import { NextApiResponse } from "next"

// apply build function
export const buildResponse = async (
  res: NextApiResponse,
  func: () => Promise<any>
) => {
  try {
    const result = await func()
    if (result === undefined) {
      res.status(204).send(null)
    } else {
      res.status(200).json(result)
    }
  } catch (e: any) {
    console.log(e)
    const status = e.status || 500
    res.status(status).json({ status, message: e.message })
  }
}
