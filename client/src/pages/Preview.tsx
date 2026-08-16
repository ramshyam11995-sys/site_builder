import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2Icon } from 'lucide-react';
import ProjectPreview from '../components/ProjectPreview';
import type { Project, Version } from '../types';
import api from '@/configs/axios';
import { toast } from 'sonner';

const Preview = () => {
  const { projectId, versionId } = useParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCode = async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get(`/api/project/preview/${projectId}`);
      const project = data?.project;

      if (!project) {
        setLoading(false);
        return;
      }

      const currentCode = project.current_code || '';
      const selectedVersion = versionId
        ? project.versions?.find((version: Version) => version.id === versionId)
        : null;

      setCode(selectedVersion?.code || currentCode || '');
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }
  };

  useEffect(() => {
    void fetchCode();
  }, [projectId, versionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2Icon className="size-7 animate-spin text-indigo-200" />
      </div>
    );
  }

  if (!code) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p className="text-lg">Project preview is unavailable.</p>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <ProjectPreview Project={{ current_code: code } as Project} isGenerating={false} showEditorPanel={false} />
    </div>
  );
};

export default Preview;
