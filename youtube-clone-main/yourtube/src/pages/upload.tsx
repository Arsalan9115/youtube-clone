import { useState, FormEvent, ChangeEvent } from 'react'
import axiosInstance from '@/lib/axiosinstance'

export default function Upload() {
  const [title, setTitle] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if(!file || !user._id) return alert("Login karo aur file chuno")

    setLoading(true)
    const formData = new FormData()
    formData.append('video', file)
    formData.append('videotitle', title)
    formData.append('uploader', user._id)
    formData.append('videochanel', user.name || 'YourTube user')

    try {
      await axiosInstance.post('/video/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      alert("Video uploaded successfully!")
      setTitle('')
      setFile(null)
    } catch(err) {
      alert("Upload Error")
    }
    setLoading(false)
  }

  return (
    <div className="p-6 text-white bg-black min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Upload Video</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
        <input type="text" placeholder="Video Title" value={title} onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} className="p-3 rounded bg-gray-800" required />
        <input type="file" accept="video/mp4" onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)} className="p-3 rounded bg-gray-800" required />
        <button disabled={loading} className="bg-red-600 p-3 rounded font-bold">{loading? 'Uploading...' : 'Upload'}</button>
      </form>
    </div>
  )
}
