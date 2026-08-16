import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Project } from '../types'
import { ArrowBigDownDashIcon, EyeIcon, EyeOffIcon, FullscreenIcon, LaptopIcon, Loader2Icon, MessageSquareIcon, SaveIcon, SmartphoneIcon, TabletIcon } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import ProjectPreview from '../components/ProjectPreview'
import api from '@/configs/axios'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'


const Projects = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const {data: session, isPending} = authClient.useSession()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const [isGenerating, setIsGenerating] = useState(false)
  const [device, setDevice] = useState<'phone' | 'tablet' | 'desktop'>('desktop')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const normalizeProject = (rawProject: any): Project => ({
    ...rawProject,
    conversation: (rawProject?.conversation ?? rawProject?.conversations ?? []).map((item: any) => ({
      ...item,
      id: item.id ?? `${item.role}-${item.timestamp ?? Date.now()}`,
      role: item.role ?? 'assistant',
      content: item.content ?? '',
      timestamp: item.timestamp ?? new Date().toISOString(),
    })),
    versions: (rawProject?.versions ?? []).map((item: any) => ({
      ...item,
      id: item.id ?? `${item.timestamp ?? Date.now()}`,
      timestamp: item.timestamp ?? new Date().toISOString(),
      code: item.code ?? '',
    })),
    current_code: rawProject?.current_code ?? '',
    current_version_index: rawProject?.current_version_index ?? '',
  })

  const fetchProject = async () => {
   try {
    const {data} = await api.get(`/api/user/Project/${projectId}`);
    console.log('PROJECT_PAYLOAD', data.project);
    const normalizedProject = normalizeProject(data.project);
    console.log('NORMALIZED_PROJECT', normalizedProject);
    setProject(normalizedProject)
    setIsGenerating(!normalizedProject.current_code)
    setLoading(false)
   } catch (error: any) {
    setLoading(false)
    setIsGenerating(false)
    toast.error(error?.response?.data?.message || error.message);
    console.log(error);
   }
  }

  const saveProject = async () => {
    if (!projectId || !project) return;

    const code = project.current_code;
    if (!code) {
      toast.error('There is no project code to save yet.');
      return;
    }

    setIsSaving(true);
    try {
      const { data } = await api.put(`/api/project/save/${projectId}`, { code });
      setProject((prev) => prev ? { ...prev, current_code: code } : prev);
      toast.success(data?.message || 'Project saved successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    } finally {
      setIsSaving(false);
    }
  }

  // download code ( indxt.html)
  const downloadCode = () => {
    const code = project?.current_code;
    if(!code){
      if(isGenerating){
        return
      }
      return
    }
    const element = document.createElement('a');
    const file = new Blob([code], {type:"text/html"});
    element.href = URL.createObjectURL(file)
    element.download = "index.html";
    document.body.appendChild(element)
    element.click();
  }
  const togglePublish = async () => {
    if (!projectId || !project) return;

    try {
      const { data } = await api.get(`/api/user/publish-toggle/${projectId}`);
      setProject((prev) => prev ? { ...prev, isPublished: !prev.isPublished } : prev);
      toast.success(data?.message || 'Project updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }
  }

  useEffect(()=>{
    if(session?.user){
      void fetchProject();
    }else if(!isPending && !session?.user){
      navigate("/")
      toast("Please login to view your project")
    }
  },[session?.user, isPending, navigate, projectId])

  useEffect(() => {
    if(project && !project.current_code){
      const intervalId = setInterval(fetchProject, 10000);
      return ()=> clearInterval(intervalId)
    }
  }, [project])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2Icon className="size-7 animate-spin text-violet-200" />
      </div>
    )
  }

  return project ? (
    <div className='flex flex-col h-screen w-full bg-gray-900 text-white'>
      {/* builder navbar */}
      <div className='flex max-sm:flex-col sm:items-center gap-4 px-4 py-2 no-scrollbar'>
        {/* left */}
        <div className='flex items-center gap-2 sm:min-w-90 text-nowrap'>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="sm:hidden p-1.5 rounded-lg bg-gray-800 border border-gray-700 text-indigo-400 hover:text-white transition-colors"
            title="Toggle Chat"
          >
            <MessageSquareIcon size={18} />
          </button>
          <img src="/favicon.svg" alt="logo" className="h-6 cursor-pointer" onClick={() => navigate('/')} />
          <div className='max-w-64 sm:max-w-xs'>
            <p className='text-sm font-medium capitalize truncate'>{project.name}</p>
            <p className='text-xs text-gray-400 -mt-0.5'>Previewing last saved version</p>
          </div>
        </div>
        {/* middle */}
        <div className='hidden sm:flex gap-2 bg-gray-950 p-1.5 rounded-md'>
          <SmartphoneIcon onClick={() => setDevice('phone')} className={`size-6 p-1 rounded cursor-pointer ${device === 'phone' ? 'bg-gray-700' : ''}`} />
          <TabletIcon onClick={() => setDevice('tablet')} className={`size-6 p-1 rounded cursor-pointer ${device === 'tablet' ? 'bg-gray-700' : ''}`} />
          <LaptopIcon onClick={() => setDevice('desktop')} className={`size-6 p-1 rounded cursor-pointer ${device === 'desktop' ? 'bg-gray-700' : ''}`} />
        </div>
        {/* right */}
        <div className='flex items-center justify-end gap-3 flex-1 text-xs sm:text-sm'>
          <button onClick={saveProject} disabled={isSaving} className='max-sm:hidden bg-gray-800 hover:bg-gray-700 text-white px-3.5 py-1 flex items-center gap-2 rounded sm:rounded-sm transition-colors border border-gray-700'>
            {isSaving ? <Loader2Icon className='animate-spin' size={16} /> : <SaveIcon size={16} />} Save
          </button>
          <Link target='_blank' to={`/preview/${projectId}`} className='flex items-center gap-2 px-4 py-1 rounded sm:rounded-sm border border-gray-700 hover:border-gray-500 transition-colors'>
            <FullscreenIcon size={16} /> Preview
          </Link>
          <button onClick={downloadCode} className='bg-gradient-to-br from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white px-3.5 py-1 flex items-center gap-2 rounded sm:rounded-sm transition-colors'>
            <ArrowBigDownDashIcon size={16} /> Download
          </button>
          <button onClick={togglePublish} className='bg-gradient-to-br from-indigo-700 to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white px-3.5 py-1 flex items-center gap-2 rounded sm:rounded-sm transition-colors'>
            {project.isPublished ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
            {project.isPublished ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      <div className='flex-1 flex overflow-hidden min-h-0 p-2 gap-3'>
        <Sidebar
          isMenuOpen={isMenuOpen}
          project={project}
          projectId={projectId ?? ''}
          setProject={(p) => setProject(p)}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
          refreshProject={fetchProject}
        />
        <ProjectPreview
          Project={project}
          isGenerating={isGenerating}
          device={device}
        />
      </div>
    </div>
  ) : (
    <div className='flex items-center justify-center h-screen'>
      <p className='text-2xl font-medium text-gray-200'>Unable to load project!</p>
    </div>
  )
}

export default Projects 