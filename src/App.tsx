import {BrowserRouter, Routes, Route, useLocation} from 'react-router-dom';
import { lazy, Suspense } from 'react';
import './App.css'
import Index from './pages/Index';
import ProjetosTodos from './pages/projetos-todos';
import { RouteTransitionProvider } from './components/loading';
import { LoadingPreview } from './components/loading/loading-preview';
import { SpritePreview } from './components/mascot/sprite-preview';
import { SpriteStudio } from './components/mascot/studio/sprite-studio';
import Mascot from './components/mascot/Mascot';

// Editor pesado, só de desenvolvimento: import dinâmico para o bundle do site
// não carregar um editor inteiro que ninguém vê em produção.
const PixelEditor = lazy(() =>
  import('./components/pixel-editor/editor').then((module) => ({ default: module.PixelEditor })),
)

const NoxPreview = lazy(() =>
  import('./components/mascot/nox/nox-preview').then((module) => ({ default: module.NoxPreview })),
)

const NoxImport = lazy(() =>
  import('./components/mascot/nox/nox-import').then((module) => ({ default: module.NoxImport })),
)


function SiteMascot() {
  const { pathname } = useLocation()
  // Nas páginas de preview o mascote do site atrapalha a comparação.
  if (pathname.startsWith('/__')) return null
  return <Mascot />
}

function App() {
  return (
    <BrowserRouter>
      {/* Tela de carregamento de troca de rota (não é a introdução). */}
      <RouteTransitionProvider>
        <Routes>
          {/* Previews manuais, só em desenvolvimento. */}
          {import.meta.env.DEV && (
            <>
              <Route path='/__loading-preview' element={<LoadingPreview />} />
              <Route path='/__sprite-preview' element={<SpritePreview />} />
              <Route path='/__sprite-studio' element={<SpriteStudio />} />
              <Route
                path='/__nox-preview'
                element={
                  <Suspense fallback={null}>
                    <NoxPreview />
                  </Suspense>
                }
              />
              <Route
                path='/__nox-import'
                element={
                  <Suspense fallback={null}>
                    <NoxImport />
                  </Suspense>
                }
              />
              <Route
                path='/__pixel-editor'
                element={
                  <Suspense fallback={null}>
                    <PixelEditor />
                  </Suspense>
                }
              />
            </>
          )}
          <Route path='/projetos' element={<ProjetosTodos />} />
          <Route path='*' element={<Index />} />
          <Route path='/' element={<Index />} />
        </Routes>
      </RouteTransitionProvider>
      <SiteMascot />
    </BrowserRouter>
  )
}

export default App
