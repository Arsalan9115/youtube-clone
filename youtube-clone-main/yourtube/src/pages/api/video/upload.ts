import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method!== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // This compatibility route must forward to the Express API. Previously it
  // only wrote to Next.js/public and localStorage, so no video appeared in
  // MongoDB Compass.
  const form = formidable({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err)
      return res.status(500).json({ message: 'Upload error' })
    }

    // Next.js 15 me files ka structure alag hota hai
    const file = Array.isArray(files.video)? files.video[0] : files.video

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const fieldValue = (value: string | string[] | undefined) =>
      Array.isArray(value) ? value[0] : value || ''

    try {
      const uploadForm = new FormData()
      uploadForm.append(
        'video',
        new Blob([await fs.promises.readFile(file.filepath)], { type: file.mimetype || 'video/mp4' }),
        file.originalFilename || 'video.mp4'
      )
      uploadForm.append('videotitle', fieldValue(fields.videotitle))
      uploadForm.append('videochanel', fieldValue(fields.videochanel))
      uploadForm.append('uploader', fieldValue(fields.uploader))

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const apiResponse = await fetch(`${apiUrl}/video/upload`, {
        method: 'POST',
        body: uploadForm,
      })
      const payload = await apiResponse.json()
      return res.status(apiResponse.status).json(payload)
    } catch (uploadError) {
      console.error(uploadError)
      return res.status(502).json({ message: 'Backend video upload failed' })
    } finally {
      fs.promises.unlink(file.filepath).catch(() => undefined)
    }
  });
}
