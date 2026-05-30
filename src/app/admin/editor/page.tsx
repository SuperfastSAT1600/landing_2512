import { Suspense } from 'react';
import BlogEditor from './BlogEditor';

export default function EditorPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#151719] text-white">
                    Loading Editor...
                </div>
            }
        >
            <BlogEditor />
        </Suspense>
    );
}
