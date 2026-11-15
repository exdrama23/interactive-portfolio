import {BrowserRouter, Routes, Route} from 'react-router-dom';
import './App.css'
import Index from './pages/Index';
import { RouteTransitionProvider } from './components/loading';
import { LoadingPreview } from './components/loading/loading-preview';
// import Header from './components/Header';
// import Footer from './components/Footer';


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
          <Route path='*' element={<Index />} />
          <Route path='/' element={<Index />} />
          {/* <Route path='/header' element={<Header/>} /> */}
          {/* <Route path='/footer' element={<Footer/>} /> */}
        </Routes>
      </RouteTransitionProvider>
    </BrowserRouter>
  )
}

export default App
