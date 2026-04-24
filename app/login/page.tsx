export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg border border-gray-700">
        <h1 className="text-2xl font-bold text-white mb-2">Bastion</h1>
        <p className="text-gray-400 text-sm mb-8">Sign in to your account</p>

        <form className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-300 mb-1 block">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              spellCheck={false}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 mb-1 block">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
          >
            Sign in
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <a href="/register" className="text-blue-400 hover:underline">
            Register
          </a>
        </p>
      </div>
    </main>
  )
}