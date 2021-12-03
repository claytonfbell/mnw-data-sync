import qs from "querystring"
import "whatwg-fetch"

// prototype.js library causes problems
// https://stackoverflow.com/questions/710586/json-stringify-array-bizarreness-with-prototype-js
// @ts-ignore
delete Array.prototype.toJSON

class Rest {
  public baseURL = ""

  setBaseURL = (baseURL: string) => {
    this.baseURL = baseURL
  }

  buildUrl = (url: string) => `${this.baseURL}${url}`

  get = (url: string, query = {}, bust = true) => {
    if (bust) {
      query = {
        bustCache: bust ? `${Math.random()}` : "",
        ...query,
      }
    }

    const urlWithQuery =
      Object.keys(query).length > 0
        ? `${this.buildUrl(url)}?${qs.stringify(query)}`
        : this.buildUrl(url)

    return fetch(urlWithQuery, {
      method: "GET",
    }).then(this._handleResponse)
  }

  put = (url: string, data: object) => {
    return fetch(this.buildUrl(url), {
      method: "PUT",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }).then(this._handleResponse)
  }

  post = (url: string, data: object = {}) => {
    return fetch(this.buildUrl(url), {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }).then(this._handleResponse)
  }

  delete = (url: string) => {
    return fetch(this.buildUrl(url), {
      method: "DELETE",
      credentials: "same-origin",
    }).then(this._handleResponse)
  }

  uploadFileMultiPart = (url: string, file: File) => {
    const formData = new FormData()
    formData.append("uploadedFile", file)

    return fetch(this.buildUrl(url), {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    }).then(this._handleResponse)
  }

  _handleResponse = async (res: Response) => {
    if (res.status === 200) {
      return res.json()
    } else if (res.status >= 400) {
      const err: RestError = { status: 0, message: "Connection Failure" }
      err.status = res.status
      err.message = (await res.json()).message
      throw err
    }
  }
}

export default new Rest()

export interface RestError {
  message: string
  status: number
}

// For silencing errors for promises
// promise.catch(suppressError)
export const suppressError = (err: RestError) => {
  console.log(`Supporessed Error:`)
  console.log(err)
}
