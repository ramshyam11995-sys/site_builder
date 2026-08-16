import { forwardRef, useEffect, useRef, useState, useImperativeHandle } from 'react'
import type { Project } from '../types';
import { iframeScript } from '../assets/assets';
import EditorPanel from './EditorPanel';
import LoaderSteps from './LoaderSteps';

interface ProjectPreviewProps {
    Project: Project;
    isGenerating: boolean;
    device?: 'phone' | 'tablet' | 'desktop';
    showEditorPanel?: boolean;
}

export interface ProjectPreviewRef {
    getCode: () => string | undefined;
}

const ProjectPreview = forwardRef<ProjectPreviewRef, ProjectPreviewProps>(({ Project, isGenerating, device = 'desktop', showEditorPanel = true }, ref) => {

    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [selectedElement, setSelectedElement] = useState<any>(null)
    
    const resolutions = {
        phone: 'w-[412px]',
        tablet: 'w-[768px]',
        desktop: 'w-full'
    }


    // FIX 1: Expose the getCode function to the parent component using the ref
    useImperativeHandle(ref, () => ({
        getCode: () =>{ 
          const doc = iframeRef.current?.contentDocument;
          if(!doc) return undefined;

          // 1. Remove our selectin class / attribute/ outline from all element 
          doc.querySelectorAll('.ai-selected-element,[data-ai-selected]').forEach  
          ((el)=>{
            el.classList.remove('ai-selected-element');
            el.removeAttribute('data-ai-selected');
            (el as HTMLElement).style.outline = '';
          })

          //2. Remove injected style + script from the document
          const previewStyle = doc.getElementById('ai-preview-style');
          if(previewStyle) previewStyle.remove();

          const previewScript = doc.getElementById('ai-preview-script');
          if(previewScript) previewScript.remove();

          // 3. Serialize clean HTML
          const html = doc.documentElement.outerHTML;
          return html;
        }    
    }));

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'ELEMENT_SELECTED') {
                setSelectedElement(event.data.payload);
            } else if (event.data.type === 'CLEAR_SELECTION') {
                setSelectedElement(null)
            }
        }
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage)
    }, [])

    const handleUpdate = (updates: any) => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'UPDATE_ELEMENT',
                payload: updates
            }, '*')
        }
    }

    const normalizeHtml = (html: string) => html
        .replace(/```(?:html)?\s*/gi, '')
        .replace(/```/g, '')
        .replace(/<\/\s+script\s*>/gi, '</script>')
        .trim();

    const injectPreview = (html: string) => {
        const normalizedHtml = normalizeHtml(html);
        if (!normalizedHtml) return '';
        if (!showEditorPanel) return normalizedHtml

        if (normalizedHtml.includes('</body>')) {
            return normalizedHtml.replace('</body>', iframeScript + '</body>')
        } else {
            return normalizedHtml + iframeScript;
        }
    }

    return (
        <div className='relative h-full bg-gray-900 flex-1 rounded-xl overflow-hidden max-sm:ml-2'>
            {Project.current_code ? (
                <>
                    <iframe
                        ref={iframeRef}
                        srcDoc={injectPreview(Project.current_code)}
                        className={`h-full max-sm:w-full ${resolutions[device]} mx-auto transition-all`}
                    />
                    {showEditorPanel && selectedElement && (
                        <EditorPanel
                            selectedElement={selectedElement}
                            onUpdate={handleUpdate}
                            onClose={() => {
                                setSelectedElement(null);
                                if (iframeRef.current?.contentWindow) {
                                    // FIX 2: Fixed spelling typo 'CLEAR_SELECTED_REQEST' -> 'CLEAR_SELECTED_REQUEST'
                                    iframeRef.current.contentWindow.postMessage({ type: 'CLEAR_SELECTION_REQUEST' }, '*')
                                }
                            }}
                        />
                    )}
                </>
            ) : isGenerating && (
                <LoaderSteps />
            )}
        </div>
    )
})

export default ProjectPreview
