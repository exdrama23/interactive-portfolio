import {BrowserRouter, Routes, Route} from 'react-router-dom';
import './App.css'
import Index from './pages/Index';
import ProjetosTodos from './pages/projetos-todos';
import { RouteTransitionProvider } from './components/loading';
import { LoadingPreview } from './components/loading/loading-preview';


function App() {
  return (
    <BrowserRouter>
      <RouteTransitionProvider>
        <Routes>
          {import.meta.env.DEV && (
            <Route path='/__loading-preview' element={<LoadingPreview />} />
          )}
          <Route path='/projetos' element={<ProjetosTodos />} />
          <Route path='*' element={<Index />} />
          <Route path='/' element={<Index />} />
        </Routes>
      </RouteTransitionProvider>
    </BrowserRouter>
  )
}

export default App
