import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { initializeAppStorage } from './persistence/appStorage'
import { getWebsiteUrl } from './pwa/runtimeContext'
import { prepareServiceWorker } from './pwa/update'
import './pwa/install'

function renderStorageError(error: unknown) {
  console.error('Failed to initialize application storage', error)
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <main className="min-h-full flex items-center justify-center bg-gray-100 p-6 text-ink font-mono">
      <section className="w-full max-w-lg border-2 border-ink bg-paper p-6 shadow-[6px_6px_0_var(--color-ink)]">
        <h1 className="font-heading text-xl font-bold">The application could not start</h1>
        <p className="mt-3 text-sm">
          The app stopped before opening a workspace. Your website and installed data remain separate and unchanged.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="border-2 border-ink bg-accent px-4 py-2 font-bold text-paper"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
          <a
            className="border-2 border-ink bg-paper px-4 py-2 font-bold text-ink"
            href={getWebsiteUrl()}
            target="_blank"
            rel="noreferrer"
          >
            Open website
          </a>
        </div>
      </section>
    </main>,
  )
}

async function start() {
  try {
    await prepareServiceWorker()
    const bootstrapResult = await initializeAppStorage()
    const [{ default: App }, { applyTheme }] = await Promise.all([
      import('./App'),
      import('./store/useThemeStore'),
    ])

    applyTheme('default')
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App storageBootstrap={bootstrapResult} />
      </React.StrictMode>,
    )
  } catch (error) {
    renderStorageError(error)
  }
}

void start()
