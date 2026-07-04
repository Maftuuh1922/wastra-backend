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

// Endpoint 1: Classification (MobileNetV3 on Hugging Face)
app.post('/classify', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return c.json({ error: 'No image provided' }, 400)
    }

    const HF_TOKEN = process.env.HF_TOKEN
    // The user's classification model on HF
    const MODEL_ID = process.env.HF_MODEL_CLASSIFY || 'google/mobilenet_v2_1.0_224' // Placeholder

    if (!HF_TOKEN) {
      return c.json({ error: 'HF_TOKEN environment variable is not set' }, 500)
    }

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL_ID}`,
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': file.type,
        },
        method: 'POST',
        body: file,
      }
    )

    const result = await response.json()
    return c.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Classification error:', error)
    return c.json({ error: 'Failed to process image' }, 500)
  }
})

// Endpoint 2: Detection (YOLOv8 on Hugging Face - to be uploaded)
app.post('/detect', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return c.json({ error: 'No image provided' }, 400)
    }

    const HF_TOKEN = process.env.HF_TOKEN
    // The user's future YOLO model on HF
    const MODEL_ID = process.env.HF_MODEL_DETECT || 'keremberke/yolov8m-hard-hat-detection' // Placeholder

    if (!HF_TOKEN) {
      return c.json({ error: 'HF_TOKEN environment variable is not set' }, 500)
    }

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL_ID}`,
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': file.type,
        },
        method: 'POST',
        body: file,
      }
    )

    const result = await response.json()
    return c.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Detection error:', error)
    return c.json({ error: 'Failed to process image' }, 500)
  }
})

export default handle(app)
