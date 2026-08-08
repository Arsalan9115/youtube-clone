import type { NextApiRequest, NextApiResponse } from 'next'

// Temporary memory me store hoga
let comments: any[] = [] 

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { videoId, text } = req.body
    
    if (!text || !videoId) {
      return res.status(400).json({ message: "Missing data" })
    }

    const newComment = { 
      id: Date.now(), 
      videoId, 
      text,
      author: "Guest",
      createdAt: new Date()
    }
    
    comments.push(newComment)
    console.log("New comment:", newComment)
    return res.status(200).json({ success: true, message: "Comment saved" })
  }
  
  if (req.method === 'GET') {
    const { videoId } = req.query
    const videoComments = comments.filter(c => c.videoId === videoId)
    return res.status(200).json(videoComments)
  }

  return res.status(405).json({ message: "Method not allowed" })
}