import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import SectionPage from './pages/SectionPage.jsx'
import TopicPage from './pages/TopicPage.jsx'
import ArticlePage from './pages/ArticlePage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import IndicatorsPage from './pages/IndicatorsPage.jsx'
import IndicatorCategoryPage from './pages/IndicatorCategoryPage.jsx'
import IndicatorDetailPage from './pages/IndicatorDetailPage.jsx'
import IposPage from './pages/IposPage.jsx'
import IpoDetailPage from './pages/IpoDetailPage.jsx'
import About from './pages/About.jsx'
import Contact from './pages/Contact.jsx'
import NotFound from './pages/NotFound.jsx'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/news" element={<SectionPage key="news" slug="news" />} />
          <Route path="/business" element={<SectionPage key="business" slug="business" />} />
          <Route path="/market" element={<SectionPage key="market" slug="market" />} />
          <Route path="/blogs" element={<SectionPage key="blogs" slug="blogs" />} />
          <Route path="/topic/:slug" element={<TopicPage />} />
          <Route path="/article/:slug" element={<ArticlePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/indicators" element={<IndicatorsPage />} />
          <Route path="/indicators/category/:slug" element={<IndicatorCategoryPage />} />
          <Route path="/indicators/:slug" element={<IndicatorDetailPage />} />
          <Route path="/ipos" element={<IposPage />} />
          <Route path="/ipos/:slug" element={<IpoDetailPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
