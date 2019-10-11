import { WebClient, RTMClient, LogLevel } from '@slack/client'
const mj = require('mathjax-node')
const svg2png = require('svg2png')
import { AllHtmlEntities } from 'html-entities'
const asciimath2latex = require('asciimath-to-latex')
const entities = new AllHtmlEntities()

mj.start()
let token = require('../token.json').token
let rtm = new RTMClient(token, {logLevel: LogLevel.INFO})
let web = new WebClient(token, {logLevel: LogLevel.INFO})
rtm.start()
console.log('rtm connected')

let regex = /^(ascii|tex|latex|atol):(.+?)$/
const SIZE = 20

async function main() {
  async function generateImage(type: string, formula: string) {
    switch(type) {
      case 'tex':
      case 'latex':
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
    let image
    try {
        image = await svg2png(out.svg, {
        width: out.width.slice(0, -2) * SIZE,
        height: out.height.slice(0, -2) * SIZE
      })
    } catch(e) {}
    return image
  }

  rtm.on('message', async mes => {
    if(!mes.text) return
    let matches = mes.text.match(regex)
    if(matches) {
      let type = matches[1]
      let formula = entities.decode(matches[2])
      console.log(`type: ${type}, formula: ${formula}`)

      if(type != 'atol') {
        let image
        try {
          image = await generateImage(type, formula)
        } catch(e) {
          await web.chat.postMessage({
            channel: mes.channel,
            text: `Failed to render: ${e}`,
            as_user: true
          })
          return
        }

        await web.files.upload({
          title: `${formula}`,
          file: image,
          channels: mes.channel,
          filename: `${formula}.png`,
        })
      } else {
        await web.chat.postMessage({
          channel: mes.channel,
          text: asciimath2latex(formula),
          as_user: true
        })
        return
      } 
    }
  })
}

main()