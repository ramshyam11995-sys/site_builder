import api from '@/configs/axios';
import { authClient } from '@/lib/auth-client';
import { Loader2Icon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Inline SVGs with corrected valid vector coordinates
const FramerLogo = () => (
  <svg className="max-w-28 md:max-w-32 h-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M4 2h16v6H4V2zm0 6h10v8H4V8zm6 8h10v6H10v-6z" fill="#FFFFFF"/></svg>
);

const HuaweiLogo = () => (
  <svg className="max-w-28 md:max-w-32 h-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 280" fill="none"><g fill="#FFFFFF"><path d="M128.5 28.1c-1.3-4.5-3.6-11.4-8-17.9-1.9-2.8-5-10.2-12.7-10.2s-10.8 7.4-12.7 10.2c-4.4 6.5-6.7 13.4-8 17.9-4.8 17.6-1.5 45.4 6.9 66.8 4.7 12 10.5 21.6 13.8 21.6s9.1-9.6 13.8-21.6c8.4-21.4 11.7-49.2 6.9-66.8z"/><path d="M187.6 51c4.2-3.8 9.9-8.4 13.8-15.3 1.7-3 3.9-10.7-1.7-16.1-5.7-5.5-13.4-1.2-15.8.6-5.8 4.3-11.3 9.9-15.1 14.5-13.6 16.5-31.9 44-39.7 69.8-4.4 14.5-5.9 26.5-2.7 27.6s9.9-7.8 17.5-18.9c13.7-20 31.7-47.5 43.7-62.2z"/><path d="M69.4 51c-4.2-3.8-9.9-8.4-13.8-15.3-1.7-3-3.9-10.7 1.7-16.1 5.7-5.5 13.4-1.2 15.8.6 5.8 4.3 11.3 9.9 15.1 14.5 13.6 16.5 31.9 44 39.7 69.8 4.4 14.5 5.9 26.5 2.7 27.6s-9.9-7.8-17.5-18.9C99.4 93.2 81.4 65.7 69.4 51z"/><path d="M228.6 104.9c7.2-2.1 15-4.4 22.8-9.4 3.4-2.2 9.5-6.7 8.3-13.8-1.2-7.2-9.4-6.4-12.2-6.1-7.1.8-14.7 3.5-20.5 6-20.8 9.1-51.4 28.5-69.6 49.3-10.2 11.6-16 22-13.5 24.1s11.5-4.9 22.6-13.2c19.8-14.8 48-39.1 62.1-56.9z"/><path d="M28.4 104.9c-7.2-2.1-15-4.4-22.8-9.4-3.4-2.2-9.5-6.7-8.3-13.8 1.2-7.2 9.4-6.4 12.2-6.1 7.1.8-14.7 3.5-20.5 6-20.8 9.1-51.4 28.5-69.6 49.3-10.2 11.6-16 22 13.5 24.1s-11.5-4.9-22.6-13.2c-19.8-14.8-48-39.1-62.1-56.9z"/><path d="M246.2 173.3c8.1.1 17 .3 26.1-2 4-.1 11.4-1.3 13.2-8.3 1.8-7.1-5.9-9.1-8.7-9.7-7-.9-15.1.2-21.2 1.4-22.2 4.1-57.2 14.1-81 27.1-13.4 7.3-22.2 15.1-20.8 17.8 1.4 2.7 12-.6 25.4-6 24-9.6 57.5-27.9 67-29.8z"/><path d="M10.8 173.3c-8.1.1-17 .3-26.1-2-4-.1-11.4-1.3-13.2-8.3-1.8-7.1 5.9-9.1 8.7-9.7 7-.9 15.1.2 21.2 1.4 22.2 4.1 57.2 14.1-81 27.1-13.4 7.3-22.2 15.1-20.8 17.8-1.4 2.7-12-.6-25.4-6-24-9.6-57.5-27.9-67-29.8z"/></g><g fill="#FFFFFF"><path d="M375.4 74.3h31.1v50.4h48.3V74.3h31.1v133.5h-31.1v-55.8h-48.3v55.8h-31.1V74.3z"/><path d="M510.6 74.3h31.1v77.1c0 23.3 12.8 32.1 31.7 32.1 19.3 0 31.4-9.1 31.4-32.1V74.3h31.1v76.8c0 41.5-24.3 59.4-62.5 59.4-38.5 0-62.8-18.2-62.8-59.4V74.3z"/><path d="M670.3 74.3h32.7l39.5 133.5h-31.4l-8.4-30.1h-42.5l-8.4 30.1h-31l39.5-133.5zm27.7 76.1l-16.5-56.4-16.5 56.4h33z"/><path d="M764.1 74.3h33.4l24 94.8 24-94.8h33.4l-42.2 133.5h-30.4L764.1 74.3z"/><path d="M900.5 74.3h76.6V101h-45.5v32.7h41.5v26.4h-41.5v21.3h46.9v26.4h-78V74.3z"/></g></svg>
);

const InstagramLogo = () => (
  <svg className="max-w-28 md:max-w-32 h-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);

const MicrosoftLogo = () => (
  <svg className="max-w-28 md:max-w-32 h-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" fill="#FFFFFF"><path d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z"/></svg>
);

const WalmartLogo = () => (
  <svg className="max-w-28 md:max-w-32 h-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2"><path d="M12 2v20M2 12h20M5.64 5.64l12.72 12.72M5.64 18.36L18.36 5.64"/></svg>
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
          <svg className="mt-px" width="6" height="9" viewBox="0 0 6 9" fill="none" xmlns="http://www.w3.org/2000/svg">
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

      {/* Render layout with local inline SVG elements */}
 <div className="flex flex-wrap items-center justify-center gap-16 md:gap-20 mx-auto mt-16 opacity-80">
        <FramerLogo />
        <HuaweiLogo />
        <InstagramLogo />
        <MicrosoftLogo />
        <WalmartLogo />
      </div>
    </section>
  );
};

export default Home;
