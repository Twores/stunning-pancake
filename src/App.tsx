import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Editor from './pages/Editor'
import Landing from './pages/Landing'
import Preview from './pages/Preview'
import PublicSite from './pages/PublicSite'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Home />} />
        <Route path="/edit/:id" element={<Editor />} />
        <Route path="/preview/:id" element={<Preview />} />
        <Route path="/s/:publicId" element={<PublicSite />} />
      </Routes>
    </BrowserRouter>
  )
}
