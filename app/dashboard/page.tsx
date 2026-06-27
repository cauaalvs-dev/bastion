export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Welcome to Bastion</p>
          </div>
          <a
            href="/api/auth/logout"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded border border-gray-700 transition-colors"
          >
            Sign out
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <p className="text-gray-400 text-sm">Role</p>
            <p className="text-white font-medium mt-1">user</p>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <p className="text-gray-400 text-sm">Sessions</p>
            <p className="text-white font-medium mt-1">1 active</p>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <p className="text-gray-400 text-sm">2FA</p>
            <p className="text-white font-medium mt-1">Disabled</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-white font-medium mb-4">Security status</h2>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-sm">✓</span>
              <span className="text-gray-300 text-sm">JWT authentication active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-sm">✓</span>
              <span className="text-gray-300 text-sm">Session rotation enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-sm">⚠</span>
              <span className="text-gray-300 text-sm">2FA not configured</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}