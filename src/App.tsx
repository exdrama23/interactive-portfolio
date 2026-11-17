import {BrowserRouter, Routes, Route} from 'react-router-dom';
import './App.css'
import Index from './pages/Index';
import ProjetosTodos from './pages/projetos-todos';
import { RouteTransitionProvider } from './components/loading';
import { LoadingPreview } from './components/loading/loading-preview';
import Mascot from './components/mascot/Mascot';


function App() {
  return (
    <BrowserRouter>
      {/* Tela de carregamento de troca de rota (não é a introdução). */}
      <RouteTransitionProvider>
        <Routes>
          {/* Preview manual da tela de carregamento — só em desenvolvimento. */}
          {import.meta.env.DEV && (
            <Route path='/__loading-preview' element={<LoadingPreview />} />
          )}
          <Route path='/projetos' element={<ProjetosTodos />} />
          <Route path='*' element={<Index />} />
          <Route path='/' element={<Index />} />
        </Routes>
      </RouteTransitionProvider>
      <Mascot />
    </BrowserRouter>
  )
}

export default App
