import { WebClient, RTMClient, LogLevel } from '@slack/client'
const mj = require('mathjax-node')
const svg2png = require('svg2png')

mj.start()
let token = require('../token.json').token
let rtm = new RTMClient(token, {logLevel: LogLevel.INFO})
let web = new WebClient(token, {logLevel: LogLevel.INFO})
rtm.start()
console.log('rtm connected')

let regex = /^(ascii|tex|latex):(.+?)$/
const SIZE = 20

async function main() {
  async function generateImage(type: string, formula: string) {
    switch(type) {
      case 'tex' || 'latex':
        type = 'TeX'
        break
      case 'ascii':
        type = 'AsciiMath'
        break
      default: break
    }
    let out = await mj.typeset({
      math: formula,
      format: type,
      svg: true
    })
    let image = await svg2png(out.svg, {
      width: out.width.slice(0, -2) * SIZE,
      height: out.height.slice(0, -2) * SIZE
    })
    return image
  }

  rtm.on('message', async mes => {
    if(!mes.text) return
    let matches = mes.text.match(regex)
    if(matches) {
      let type = matches[1]
      let formula = decodeURI(matches[2])
      console.log(`type: ${type}, formula: ${formula}`)
      let image = await generateImage(type, formula)

      await web.files.upload({
        title: `${formula}`,
        file: image,
        channels: mes.channel,
        filename: `${formula}.png`,
      })
      
    }
  })
}

main()