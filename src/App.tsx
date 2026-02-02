import {BrowserRouter, Routes, Route} from 'react-router-dom';
import './App.css'
import Index from './pages/Index';
// import Header from './components/Header';
// import Footer from './components/Footer';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='*' element={<Index />} />
        <Route path='/' element={<Index />} />
        {/* <Route path='/header' element={<Header/>} /> */}
        {/* <Route path='/footer' element={<Footer/>} /> */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
