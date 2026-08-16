
import { Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Pricing from './pages/Pricing'
import Projects from './pages/Projects'
import Myprojects from './pages/Myprojects'
import Preview from './pages/Preview'
import Community from './pages/Community'
import View from './pages/View'
import Navbar from './components/Navbar'
import { Toaster } from 'sonner'
import AuthPage from './pages/auth/AuthPage'
import Settings from './pages/Settings'
import Loading from './pages/Loading'



const App = () => {

  const { pathname }= useLocation()

  const hideNavbar = (pathname.startsWith('/Projects') || pathname.startsWith('/project/')) && pathname !== '/Projects'
                      || pathname.startsWith('/view/')
                      || pathname.startsWith('/View/')
                      || pathname.startsWith('/Preview/')
                      || pathname.startsWith('/preview/')
  return (
    <div>
    <Toaster />
      {!hideNavbar && <Navbar />}
      
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/Pricing' element={<Pricing />} />
        <Route path='/project/:projectId' element={<Projects />} />
        <Route path='/Projects/:projectId' element={<Projects />} />
        <Route path='/Projects' element={<Myprojects />} />
        <Route path='/preview/:projectId' element={<Preview />} />
        <Route path='/preview/:projectId/:versionId' element={<Preview />} />
        <Route path='/Preview/:projectId' element={<Preview />} />
        <Route path='/Preview/:projectId/:versionId' element={<Preview />} />
        <Route path='/Pricing/:projectId/:versionId' element={<Preview />} />
        <Route path='/Community' element={<Community />} />
        <Route path='/View/:projectId' element={<View />} />
        <Route path="/auth/:pathname" element={<AuthPage />} />
        <Route path="/account/Settings" element={<Settings/>}/>
        <Route path="/loading" element={<Loading />} />
      </Routes>
    </div>
  )
}

export default App
