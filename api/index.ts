import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { cors } from 'hono/cors'

// Vercel Edge Runtime for maximum performance
export const config = {
  runtime: 'edge',
}

export const app = new Hono().basePath('/api')

// Enable CORS so the frontend can call this API
app.use('*', cors({
  origin: '*', // In production, replace with frontend URL
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}))

app.get('/', (c) => {
  return c.json({ message: 'Wastra Backend API is running on Hono + Vercel Edge!' })
})

// Endpoint 1: Classification (MobileNetV2 on Hugging Face Space)
app.post('/classify', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return c.json({ error: 'No image provided' }, 400)
    }

    // Call the Flask API running on Hugging Face Space
    const SPACE_URL = 'https://maftuh-main-batik-classifier.hf.space/predict'
    
    // We forward the same formData (containing 'image') to the Space
    const spaceFormData = new FormData()
    spaceFormData.append('image', file)

    const response = await fetch(SPACE_URL, {
      method: 'POST',
      body: spaceFormData,
    })

    if (!response.ok) {
      throw new Error(`Space responded with status: ${response.status}`)
    }

    const result = await response.json()
    return c.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Classification error:', error)
    return c.json({ error: 'Failed to process image' }, 500)
  }
})

// Endpoint 2: Detection (YOLOv8 on Hugging Face Space)
app.post('/detect', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return c.json({ error: 'No image provided' }, 400)
    }

    const SPACE_URL = 'https://maftuh-main-wastra-yolo-api.hf.space/predict'
    
    // We forward the same formData (containing 'image') to the Space
    const spaceFormData = new FormData()
    spaceFormData.append('image', file)

    const response = await fetch(SPACE_URL, {
      method: 'POST',
      body: spaceFormData,
    })

    if (!response.ok) {
      throw new Error(`Space responded with status: ${response.status}`)
    }

    const result = await response.json()
    return c.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Detection error:', error)
    return c.json({ error: 'Failed to process image' }, 500)
  }
})

// Endpoint 3: Generation (SD + LoRA on Hugging Face Space)
app.post('/generate', async (c) => {
  try {
    const { prompt } = await c.req.json()

    if (!prompt) {
      return c.json({ error: 'No prompt provided' }, 400)
    }

    const SPACE_URL = 'https://maftuh-main-wastra-lora-api.hf.space/generate'
    
    const response = await fetch(SPACE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    })

    if (!response.ok) {
      throw new Error(`Space responded with status: ${response.status}`)
    }

    // Since the Space returns an image, we can either return the raw binary
    // or return it as base64. Let's return the raw image buffer to the client.
    const imageBuffer = await response.arrayBuffer()
    
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
      },
    })
  } catch (error: any) {
    console.error('Generation error:', error)
    return c.json({ error: 'Failed to generate image' }, 500)
  }
})

export default handle(app)
