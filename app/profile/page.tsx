'use client'

import { useState } from 'react'

export default function ProfilePage() {
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Update failed')
        return
      }

      setSuccess(true)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <a href="/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Dashboard
          </a>
          <h1 className="text-2xl font-bold text-white">Edit profile</h1>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                spellCheck={false}
                placeholder="Your name"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1 block">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                rows={4}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
              <p className="text-gray-500 text-xs mt-1">{bio.length}/500</p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {success && <p className="text-green-400 text-sm">Profile updated.</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
            >
              {loading ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}