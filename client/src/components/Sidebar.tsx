import React, { useEffect, useRef, useState } from 'react';
import type { Message, Project, Version } from '../types';
import { BotIcon, EyeIcon, Loader2Icon, SendIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/configs/axios';
import { toast } from 'sonner';

interface SidebarProps {
  isMenuOpen: boolean;
  project: Project;
  projectId: string;
  setProject: (project: Project) => void;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  refreshProject: () => Promise<void>;
}

function isMessage(item: Message | Version): item is Message {
  return 'role' in item;
}

const Sidebar = ({
  isMenuOpen,
  project,
  projectId,
  setProject,
  isGenerating,
  setIsGenerating,
  refreshProject,
}: SidebarProps) => {
  const messageRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  const fetchProject = async () => {
    try {
      const { data } = await api.get(`api/user/project/${project.id}`);
      setProject(data.project);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }
  };

  const handleRollback = async (versionId: string) => {
    try {
      const confirm = window.confirm('Are you sure you want to rollback to this version');
      if (!confirm) return;
      setIsGenerating(true);
      const { data } = await api.get(`/api/project/rollback/${project.id}/${versionId}`);
      const { data: data2 } = await api.get(`/api/user/project/${project.id}`);
      toast.success(data.message);
      setProject(data2.project);
      setIsGenerating(false);
    } catch (error: any) {
      setIsGenerating(false);
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }
  };

  const handleRevisions = async (e: React.FormEvent) => {
    e.preventDefault();

    const message = input.trim();
    const revisionProjectId = projectId || project.id;
    if (!message || isGenerating || !revisionProjectId) {
      if (!revisionProjectId) {
        toast.error('Unable to identify project for revision.');
      }
      return;
    }

    const optimisticUserMessage: Message = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    const optimisticAssistantMessage: Message = {
      id: `${Date.now()}-assistant`,
      role: 'assistant',
      content: 'Working on your website...',
      timestamp: new Date().toISOString(),
    };

    setProject({
      ...project,
      conversation: [...project.conversation, optimisticUserMessage, optimisticAssistantMessage],
    });
    setInput('');
    setIsGenerating(true);

    let interval: ReturnType<typeof setInterval> | undefined;

    try {
      interval = setInterval(() => {
        fetchProject();
      }, 10000);

      const { data } = await api.post(`/api/project/revision/${revisionProjectId}`, { message });
      await refreshProject();
      toast.success(data.message);
    } catch (error: any) {
      setProject({
        ...project,
        conversation: project.conversation.filter(
          (msg) => msg.id !== optimisticUserMessage.id && msg.id !== optimisticAssistantMessage.id
        ),
      });
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    } finally {
      if (interval) clearInterval(interval);
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating && input.trim()) {
        handleRevisions(e as unknown as React.FormEvent);
      }
    }
  };

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [project.conversation.length, project.versions.length, isGenerating]);

  const combinedFeed = [...(project.conversation ?? []), ...(project.versions ?? [])].sort(
    (a, b) => new Date(a.timestamp ?? 0).getTime() - new Date(b.timestamp ?? 0).getTime()
  );

  return (
    <div
      className={`h-full flex flex-col min-h-0 rounded-2xl bg-[#0b0c15] border border-gray-800/80 shadow-2xl shadow-black/40 overflow-hidden transition-all ${
        isMenuOpen
          ? 'w-full max-sm:flex-shrink-0'
          : 'max-sm:hidden w-full md:w-[320px] lg:w-[340px] xl:w-[360px] flex-shrink-0'
      }`}
    >
      <style>{`
        .chat-scroll::-webkit-scrollbar { width: 5px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb {
          background: rgba(99,102,241,0.3);
          border-radius: 9999px;
        }
        .chat-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(99,102,241,0.6);
        }
        .chat-scroll { scrollbar-width: thin; scrollbar-color: rgba(99,102,241,0.3) transparent; }
      `}</style>

      {/* ✅ Message Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto chat-scroll px-3 py-4 flex flex-col gap-3">
        {combinedFeed.length === 0 && !isGenerating && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-2">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <BotIcon className="size-6 text-indigo-400" />
            </div>
            <p className="text-xs text-gray-400">
              Start a conversation to build or refine your website.
            </p>
          </div>
        )}

        {combinedFeed.map((item) => {
          if (isMessage(item)) {
            const msg = item as Message;
            return (
              <div key={msg.id} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/80 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-indigo-950">
                  <BotIcon className="size-4 text-white" />
                </div>
                <div className="flex-1 min-w-0 bg-[#16182c] border border-gray-800/80 rounded-2xl px-3.5 py-3 text-xs leading-relaxed text-gray-200 shadow-md">
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            );
          } else {
            const ver = item as Version;
            return (
              <div key={ver.id} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/80 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-indigo-950">
                  <BotIcon className="size-4 text-white" />
                </div>
                <div className="flex-1 min-w-0 bg-[#16182c] border border-gray-800/80 rounded-2xl p-3.5 text-gray-200 shadow-md">
                  <div className="text-xs font-semibold text-gray-300 mb-0.5">
                    code updated
                  </div>
                  <div className="text-[11px] text-gray-500 mb-2.5">
                    {new Date(ver.timestamp).toLocaleString()}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {String(project.current_version_index) === String(ver.id) ? (
                      <span className="px-3 py-1 rounded-full text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Current
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRollback(ver.id)}
                        className="px-3 py-1 rounded-full text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
                      >
                        Roll back to this version
                      </button>
                    )}
                    <Link target="_blank" to={`/preview/${project.id}/${ver.id}`}>
                      <div className="w-7 h-7 rounded-full bg-gray-800/80 hover:bg-indigo-600 transition-colors flex items-center justify-center text-gray-400 hover:text-white border border-gray-700/60">
                        <EyeIcon className="size-3.5" />
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            );
          }
        })}

        {/* ✅ Three dot loading animation */}
        {isGenerating && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/80 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-indigo-950">
              <BotIcon className="size-4 text-white" />
            </div>
            <div className="bg-[#16182c] border border-gray-800/80 rounded-2xl px-4 py-3 flex gap-1.5 items-center">
              <span
                className="size-2 rounded-full bg-indigo-400 animate-bounce"
                style={{ animationDelay: '0ms', animationDuration: '0.8s' }}
              />
              <span
                className="size-2 rounded-full bg-violet-400 animate-bounce"
                style={{ animationDelay: '160ms', animationDuration: '0.8s' }}
              />
              <span
                className="size-2 rounded-full bg-purple-400 animate-bounce"
                style={{ animationDelay: '320ms', animationDuration: '0.8s' }}
              />
            </div>
          </div>
        )}

        <div ref={messageRef} className="h-1" />
      </div>

      {/* ✅ Input Box at bottom */}
      <div className="flex-shrink-0 px-3 py-3 bg-[#0b0c15] border-t border-gray-800/60">
        <form onSubmit={handleRevisions}>
          <div className="relative rounded-2xl bg-[#141627] border border-gray-800/80 focus-within:border-indigo-500/60 transition-all shadow-md">
            <textarea
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              value={input}
              rows={2}
              placeholder="Describe your website or request changes…"
              className="w-full bg-transparent p-3 pr-10 rounded-2xl resize-none text-xs outline-none text-gray-200 placeholder-gray-500 leading-relaxed min-h-[54px] max-h-[120px]"
              disabled={isGenerating}
            />
            <button
              type="submit"
              disabled={isGenerating || !input.trim()}
              className="absolute bottom-2.5 right-2.5 size-7 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-md"
            >
              {isGenerating ? (
                <Loader2Icon className="size-3.5 animate-spin text-white" />
              ) : (
                <SendIcon className="size-3.5 text-white" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Sidebar;