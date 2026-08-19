import api from '@/configs/axios';
import { authClient } from '@/lib/auth-client';
import { Loader2Icon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Compact SVG Vector Elements
const FramerIcon = () => (
  <svg className="w-5 h-5 min-w-[20px]" viewBox="0 0 24 24" fill="none" xmlns="http://w3.org"><path d="M4 2h16v6H4V2zm0 6h10v8H4V8zm6 8h10v6H10v-6z" fill="currentColor"/></svg>
);

const HuaweiIcon = () => (
  <svg className="w-6 h-6 min-w-[24px]" viewBox="0 0 24 24" fill="none" xmlns="http://w3.org"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-12S17.52 2 12 2zm1 17h-2v-2h2v2zm0-4h-2V7h2v8z" fill="currentColor"/></svg>
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

      {/* Horizontal, perfectly aligned, small brand logos with labels */}
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

