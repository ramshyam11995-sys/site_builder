import api from '@/configs/axios';
import { authClient } from '@/lib/auth-client';
import { Loader2Icon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// ORIGINAL BRAND ICONS
const FramerIcon = () => (
  <svg className="w-5 h-5 min-w-[20px]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://w3.org">
    <path d="M4 2h16v6H4V2zm0 6h10v8H4V8zm6 8h10v6H10v-6z"/>
  </svg>
);

const HuaweiIcon = () => (
  <svg className="w-5 h-5 min-w-[20px]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://w3.org">
    <path d="M12 4.14c-.11-.38-.3-.98-.67-1.54-.16-.24-.43-.88-1.1-.88s-.93.64-1.1.88c-.38.56-.58 1.16-.69 1.54-.42 1.52-.13 3.92.59 5.77.41 1.04.91 1.86 1.2 1.86s.79-.82 1.2-1.86c.72-1.85 1.01-4.25.57-5.77zm5.1 1.98c.36-.33.85-.73 1.19-1.32.15-.26.34-.92-.15-1.39-.49-.47-1.15-.1-1.36.05-.5.37-.97.85-1.3 1.25-1.17 1.42-2.75 3.8-3.42 6.03-.38 1.25-.51 2.29-.23 2.38s.85-.67 1.51-1.63c1.18-1.72 2.73-4.1 3.76-5.37zm-10.2 0c-1.03 1.27-2.58 3.65-3.76 5.37-.66.96-1.23 1.72-1.51 1.63s-.15-1.13.23-2.38c.67-2.23 2.25-4.61 3.42-6.03.33-.4 1.12-1.25 1.3-1.25.21-.15.87-.52 1.36-.05.49.47.3 1.13.15 1.39-.34.59-.83.99-1.19 1.32zm8.65 4.65c.62-.18 1.29-.38 1.96-.81.29-.19.82-.58.72-1.19-.1-.62-.81-.55-1.05-.53-.61.07-1.27.3-1.77.52-1.79.79-4.43 2.46-6 4.25-.88 1-1.38 1.9-1.16 2.08s.99-.42 1.95-1.14c1.71-1.27 4.14-3.37 5.35-4.91zm-13.7 0c1.21 1.54 3.64 3.64 5.35 4.91.96.72 1.73 1.32 1.95 1.14s-.28-1.08-1.16-2.08c-1.57-1.79-4.21-3.46-6-4.25-.5-.22-1.16-.45-1.77-.52-.24-.02-.95-.09-1.05.53-.1.61.43 1 .72 1.19.67.43 1.34.63 1.96.81zm10.15 5.91c.7-.01 1.47.01 2.25-.19.34-.01.98-.11 1.14-.72.16-.61-.51-.78-.75-.84-.6-.08-1.3.02-1.83.12-1.92.35-4.94 1.22-7 2.34-1.16.63-1.92 1.3-1.8 1.53s1.04-.05 2.19-.52c2.07-.82 4.96-2.4 5.8-2.57zm-13.2 0c.84.17 3.73 1.75 5.8 2.57 1.15.47 2.07.75 2.19.52.12-.23-.64-.9-1.8-1.53-2.06-1.12-5.08-1.99-7-2.34-.53-.1-1.23-.2-1.83-.12-.24.06-.91.23-.75.84.16.61.8.71 1.14.72.78.2 1.55.18 2.25.19z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-5 h-5 min-w-[20px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://w3.org"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);

const MicrosoftIcon = () => (
  <svg className="w-4 h-4 min-w-[16px]" viewBox="0 0 23 23" fill="currentColor" xmlns="http://w3.org"><path d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z"/></svg>
);

const WalmartIcon = () => (
  <svg className="w-5 h-5 min-w-[20px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" xmlns="http://w3.org"><path d="M12 2v20M2 12h20M5.64 5.64l12.72 12.72M5.64 18.36L18.36 5.64"/></svg>
);

const Home = () => {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmitHandler = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (!session?.user) {
        return toast.error('Please sign in to create a project');
      } else if (!input.trim()) {
        return toast.error('Please enter a message');
      }
      setLoading(true);
      const { data } = await api.post('/api/user/project', { initial_prompt: input });
      const projectId = data.projectId ?? data.ProjectId;
      setLoading(false);
      if (!projectId) {
        toast.error('Unable to create project. Please try again.');
        return;
      }
      navigate(`/Projects/${projectId}`);
    } catch (error: any) {
      setLoading(false);
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }
  };

  return (
    <section className="flex flex-col items-center text-white text-sm pb-20 px-4 font-poppins">
      <a href="https://prebuiltui.com" className="flex items-center gap-2 border border-slate-700 rounded-full p-1 pr-3 text-sm mt-20">
        <span className="bg-indigo-600 text-xs px-3 py-1 rounded-full">NEW</span>
        <p className="flex items-center gap-2">
          <span>Try 30 days free trial option</span>
          <svg className="mt-px" width="6" height="9" viewBox="0 0 6 9" fill="none" xmlns="http://w3.org">
            <path d="m1 1 4 3.5L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </p>
      </a>

      <h1 className="text-center text-[40px] leading-[48px] md:text-6xl md:leading-[70px] mt-4 font-semibold max-w-3xl">
        Turn thoughts into websites instantly, with AI.
      </h1>

      <p className="text-center text-base max-w-md mt-2">
        Create, customize and publish websites faster than ever with our AI site Builder.
      </p>

      <form onSubmit={onSubmitHandler} className="bg-white/10 max-w-2xl w-full rounded-xl p-4 mt-10 border border-indigo-600/70 focus-within:ring-2 ring-indigo-500 transition-all">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="bg-transparent outline-none text-gray-300 resize-none w-full"
          rows={4}
          placeholder="Describe your presentation in details"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="ml-auto flex items-center gap-2 bg-gradient-to-r from-[#CB52D4] to-indigo-600 rounded-md px-4 py-2 disabled:opacity-50"
        >
          {!loading ? 'Create with AI' : <>Creating <Loader2Icon className="animate-spin size-4 text-white" /></>}
        </button>
      </form>

      {/* Horizontal row layout with text descriptions and compact inline SVG elements */}
      <div className="flex flex-row flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-12 mx-auto mt-16 text-slate-400">
        <div className="flex items-center gap-2 hover:text-white transition-colors">
          <FramerIcon />
          <span className="text-sm font-medium tracking-wide">Framer</span>
        </div>
        <div className="flex items-center gap-2 hover:text-white transition-colors">
          <HuaweiIcon />
          <span className="text-sm font-medium tracking-wide">Huawei</span>
        </div>
        <div className="flex items-center gap-2 hover:text-white transition-colors">
          <InstagramIcon />
          <span className="text-sm font-medium tracking-wide">Instagram</span>
        </div>
        <div className="flex items-center gap-2 hover:text-white transition-colors">
          <MicrosoftIcon />
          <span className="text-sm font-medium tracking-wide">Microsoft</span>
        </div>
        <div className="flex items-center gap-2 hover:text-white transition-colors">
          <WalmartIcon />
          <span className="text-sm font-medium tracking-wide">Walmart</span>
        </div>
      </div>
    </section>
  );
};

export default Home;
