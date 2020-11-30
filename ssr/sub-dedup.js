/**
 * 【注了个意】这不是 JSBOX 脚本
 * ssr 去重
 */

const fs = require('fs')
const querystring = require('querystring')

const CryptoJS = require('./lib/crypto-js')

function atob(txt) {
  try {
    return Buffer.from(txt, 'base64').toString('utf-8')
  } catch (err) {
    try {
      var words = CryptoJS.enc.Base64.parse(txt);
      return words.toString(CryptoJS.enc.Utf8);
    } catch (err) {
      return '???'
    }
  }
}

function getLB(text) {
  if (text.split('\r\n').length > 1) return '\r\n'
  return '\n'
}

function main() {
  fs.readFile('./subscribe.txt', 'utf8', (err, data) => {
    try {
      const ssrString = atob(data);
      const linebreak = getLB(ssrString)
      let ssrList = ssrString.split(linebreak)
      ssrList = ssrList.map(ssr => {
        const [domain, port, protocol, encode, obfs, url] = atob(ssr.split("ssr://")[1]).split(':')
        const search = url.split('/?')[1]
        const searchObject = querystring.parse(search)
        return {
          domain,
          port,
          protocol,
          encode,
          obfs,
          remarks: atob(searchObject.remarks),
          raw: ssr
        }
      })
      
      const rawDomains = ssrList.map(e => e.domain)
      const dedupedDomains = Array.from(new Set(rawDomains))
      const dupList = []
      for (const domain of dedupedDomains) {
        const subList = ssrList.filter(e => e.domain === domain)
        if (subList.length === 0 || subList.length === 1) continue
        for (let i = 0; i < subList.length; i += 1) {
          const prev = subList[i]
          let j = i + 1
          while (j < subList.length) {
            const next = subList[j]
            if (prev.port === next.port) {
              const dupItem = subList.splice(j, 1)
              dupList.push(...dupItem)
            } else {
              j += 1
            }
          }
        }
      }
      const dedupedList = ssrList.filter(e => !dupList.includes(e))
      const newSsrList = dedupedList.map(e => e.raw)
      const newSsrString = newSsrList.join(linebreak)
      const encoded = Buffer.from(newSsrString).toString('base64')
      fs.writeFile('./subscribe-dedup.txt', encoded, 'utf8', (err) => {
        if (err) throw err;
        console.log('done');
      });
    } catch (err) {
      console.error(err)
    }
  })
}

main()