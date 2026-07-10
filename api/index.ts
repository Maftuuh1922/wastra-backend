import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { cors } from 'hono/cors'

export const app = new Hono().basePath('/api')

// Enable CORS so the frontend can call this API
app.use('*', cors({
  origin: [
    'https://wastra.vercel.app',
    'https://wastra-backend.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}))

app.get('/', (c) => {
  return c.json({ message: 'Wastra Backend API is running on Hono + Vercel Edge!' })
})

// Endpoint 1: Classification (MobileNetV3 on Hugging Face Space - Flask)
app.post('/classify', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return c.json({ error: 'No image provided' }, 400)
    }

    const SPACE_URL = 'https://maftuh-main-batik-classifier.hf.space/predict'
    
    const spaceFormData = new FormData()
    spaceFormData.append('image', file)

    const response = await fetch(SPACE_URL, {
      method: 'POST',
      body: spaceFormData,
      signal: AbortSignal.timeout(30000), // 30s timeout
    })

    if (!response.ok) {
      throw new Error(`Space responded with status: ${response.status}`)
    }

    const result = await response.json()
    return c.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Classification error:', error)
    if (error?.name === 'TimeoutError') {
      return c.json({ error: 'Space sedang startup, coba lagi dalam 30 detik' }, 503)
    }
    return c.json({ error: 'Failed to process image' }, 500)
  }
})

// Endpoint 2: Detection (YOLOv8 via Gradio HTTP API)
// Space: maftuh-main/wastra-yolo-gradio (Gradio, bukan Flask lama)
app.post('/detect', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return c.json({ error: 'No image provided' }, 400)
    }

    // Konversi file ke base64 untuk Gradio HTTP API
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type || 'image/jpeg'
    const dataUri = `data:${mimeType};base64,${base64}`

    // Gradio REST API — kirim gambar sebagai data URI, Gradio otomatis konversi ke PIL
    const GRADIO_API_URL = 'https://maftuh-main-wastra-yolo-gradio.hf.space/api/predict'

    const response = await fetch(GRADIO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [dataUri],
        fn_index: 0,
      }),
      signal: AbortSignal.timeout(60000), // 60s timeout (ZeroGPU cold start)
    })

    if (!response.ok) {
      throw new Error(`Gradio Space responded with status: ${response.status}`)
    }

    const gradioResult = await response.json()
    // Gradio response format: { "data": [json_result] }
    const detectionResult = gradioResult?.data?.[0]

    return c.json({ success: true, data: detectionResult })
  } catch (error: any) {
    console.error('Detection error:', error)
    if (error?.name === 'TimeoutError') {
      return c.json({ error: 'Space sedang startup, coba lagi dalam 30 detik' }, 503)
    }
    return c.json({ error: 'Failed to process image' }, 500)
  }
})

// Endpoint 3: Generation (SD + LoRA on Hugging Face Space - Flask)
// Note: generation bisa >60s, gunakan langsung dari FE ke Space untuk bypass timeout Vercel
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
      signal: AbortSignal.timeout(180000), // 3 menit — SD+LoRA butuh waktu
    })

    if (!response.ok) {
      throw new Error(`Space responded with status: ${response.status}`)
    }

    const imageBuffer = await response.arrayBuffer()
    
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
      },
    })
  } catch (error: any) {
    console.error('Generation error:', error)
    if (error?.name === 'TimeoutError') {
      return c.json({ error: 'Server timeout — SD+LoRA generation membutuhkan waktu lebih lama' }, 503)
    }
    return c.json({ error: 'Failed to generate image' }, 500)
  }
})

export default handle(app)
