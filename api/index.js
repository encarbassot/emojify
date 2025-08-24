import express from 'express'
import dotenv from 'dotenv'
import Joi from 'joi'
import cors from 'cors'
import { createGPT5 } from './gpt5.js'

dotenv.config()

const app = express()
app.use(express.json())
app.use(cors())

const gpt5 = createGPT5(process.env.OPENAI_API_KEY)

const schema = Joi.object({
  text: Joi.string().min(1).max(200).required(),
  history: Joi.array().default([]),
  messageHistory: Joi.array().items(Joi.string()).default([]),
  isReload: Joi.boolean().default(false)
})

app.post('/getEmojis', async (req, res) => {
  const { error, value } = schema.validate(req.body)
  if (error) return res.status(400).json({ error: error.details[0].message })

  console.log(value)

  try {
    const prompt = makePrompt(value)

    const json = await gpt5.askJSON(
      {
        name: 'EmojiOptions',
        schema: {
          type: 'object',
          properties: {
            options: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['options']
        }
      },
      prompt
    )

    res.json(json)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error con GPT' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`API en http://localhost:${PORT}`))








function makePrompt({text, history, messageHistory, isReload}) {
  const base = `
Eres un asistente que interpreta títulos o textos y devuelve 4 o 5 sugerencias en formato "emoji texto emoji".
No repitas ninguna de las sugerencias previas.
Haz caso siempre al idioma en el que se te escribe.
Tendrás que interpretar lo siguiente:
- si el usuario escribe un texto breve y sin contexto, seguramente quiere eso como titulo no lo modifiques ni lo alargues, solo si quieres ponlo en mayusculas.
- si el usuario escribe un texto largo, seguramente quiere que interpretes el tema y le des sugerencias relacionadas.
También siempre tienes que dar una lista entre 5 y 7 emojis relacionados.
Responde en JSON con el formato:
{ "options": [ "...", "...", "..." ], "emojis": [ "😀", "😂", "😍", ... ] }


`

  let chat = ""

  for (let i = 0; i < messageHistory.length; i++) {
    if(i==0){
      chat += `Usuario quiere el titulo: ${messageHistory[i]}\n`
    }else{
      chat += `Usuario refina tu  espuesta: ${messageHistory[i]}\n`
    }

    if (history[i]) {
      chat += `Asistente: ${history[i]}\n`
    }
  }

  if (isReload) {
    // no usamos "TRY AGAIN" literal, forzamos reinterpretación del último input
    const lastUserMsg = messageHistory[messageHistory.length - 1]
    chat += `El usuario no está satisfecho. Vuelve a generar nuevas sugerencias para su última petición: "${lastUserMsg}"\n`
  } else if (text) {
    chat += `Usuario: ${text}\n`
  }

  return base + chat
}


