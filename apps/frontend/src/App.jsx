import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Dictionary from './pages/Dictionary'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dictionary" element={<Dictionary />} />
    </Routes>
  )
}

export default App
