// api/gpt5.js
import OpenAI from 'openai'

export const createGPT5 = (apiKey = process.env.OPENAI_API_KEY, model = 'gpt-5') => {
  const client = new OpenAI({ apiKey })

  const ask = async (input, opts = {}) => {
    const res = await client.responses.create({
      model,
      input,
      ...opts
    })
    return res.output_text
  }

  const askJSON = async (jsonSchema, input, opts = {}) => {
    const { text: textOpts, ...rest } = opts || {}
    const format = {
      type: 'json_schema',
      name: jsonSchema.name || 'Schema',
      schema: jsonSchema.schema || jsonSchema
    }

    try {
      const res = await client.responses.create({
        model,
        reasoning:{"effort": "minimal"},
        input,
        text: { ...(textOpts || {}), format },
        ...rest
      })
      return JSON.parse(res.output_text)
    } catch (err) {
      if (err.status === 400 || err.status === 422) {
        const res = await client.responses.create({
          model,
          input: `${input}\n\nResponde únicamente con un JSON válido que cumpla este esquema:\n${JSON.stringify(format.schema)}`,
          text: { ...(textOpts || {}), format: { type: 'json_object' } },
          ...rest
        })
        return JSON.parse(res.output_text)
      }
      throw err
    }
  }

  const stream = async function* (input, opts = {}) {
    const s = await client.responses.create({
      model,
      input,
      stream: true,
      ...opts
    })
    for await (const event of s) {
      if (event.type === 'response.output_text.delta') yield event.delta
      if (event.type === 'response.completed') return
    }
  }

  return { ask, askJSON, stream }
}
