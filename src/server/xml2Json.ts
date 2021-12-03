import { parseString } from "xml2js"

// async wrapper
// https://github.com/Leonidas-from-XIV/node-xml2js/issues/159
export const xml2json = async <T>(xml: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    parseString(xml, { explicitArray: false }, (err, json) => {
      if (err) reject(err)
      else resolve(json)
    })
  })
}
