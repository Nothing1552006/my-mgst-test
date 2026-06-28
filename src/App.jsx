import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AthleteForm from './pages/AthleteForm'
import CalibrationPage from './pages/CalibrationPage'
import HorizontalGST from './pages/HorizontalGST'
import VerticalGST from './pages/VerticalGST'
import ResultsPage from './pages/ResultsPage'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/athlete" element={<AthleteForm />} />
        <Route path="/calibration" element={<CalibrationPage />} />
        <Route path="/horizontal" element={<HorizontalGST />} />
        <Route path="/vertical" element={<VerticalGST />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App