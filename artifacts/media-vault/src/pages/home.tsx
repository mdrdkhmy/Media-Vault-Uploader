import { useState, useRef } from 'react';
import { 
  useListFiles, 
  useGetFilesSummary, 
  useUploadFile, 
  useDeleteFile,
  getListFilesQueryKey,
  getGetFilesSummaryQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  UploadCloud, 
  File, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Trash2, 
  Copy,
  FolderOpen,
  HardDrive,
  Loader2,
  FileArchive,
  Play,
  ArrowUpRight
} from 'lucide-react';
import { formatBytes, formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Home() {
  const queryClient = useQueryClient();
  const { data: files, isLoading: isLoadingFiles } = useListFiles();
  const { data: summary, isLoading: isLoadingSummary } = useGetFilesSummary();
  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();
  
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  const handleUpload = async (uploadFiles: FileList | File[]) => {
    const fileArray = Array.from(uploadFiles);
    if (!fileArray.length) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    let completed = 0;
    
    for (const file of fileArray) {
      try {
        await uploadFile.mutateAsync({ data: { file } });
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
      completed++;
      setUploadProgress(Math.round((completed / fileArray.length) * 100));
    }
    
    queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetFilesSummaryQueryKey() });
    
    setIsUploading(false);
    setUploadProgress(0);
    
    if (completed > 0) {
      toast.success(`Uploaded ${completed} file(s) successfully.`);
    }
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;
    try {
      await deleteFile.mutateAsync({ id: fileToDelete });
      toast.success("File deleted permanently");
      queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetFilesSummaryQueryKey() });
    } catch (error) {
      toast.error("Failed to delete file");
    } finally {
      setFileToDelete(null);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      const fullUrl = new URL(url, window.location.origin).toString();
      await navigator.clipboard.writeText(fullUrl);
      toast.success("URL copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy URL");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-primary">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <FolderOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Media Vault</h1>
          </div>
          
          {!isLoadingSummary && summary && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full border shadow-sm">
                <HardDrive className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{formatBytes(summary.totalBytes)}</span>
                <span className="opacity-80 hidden sm:inline">used</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-10">
        
        {/* Dropzone */}
        <div 
          className={cn(
            "relative rounded-2xl border-2 border-dashed transition-all duration-300 p-12 text-center overflow-hidden bg-card",
            isDragging ? "border-primary bg-primary/5 scale-[1.01] shadow-lg" : "border-border hover:border-primary/40 hover:bg-muted/40 hover:shadow-md",
            isUploading && "pointer-events-none opacity-90"
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleUpload(e.dataTransfer.files); }}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            onChange={(e) => e.target.files && handleUpload(e.target.files)} 
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center justify-center space-y-5 animate-in fade-in duration-300">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <div className="space-y-2 w-full max-w-xs">
                <div className="flex justify-between text-sm font-medium">
                  <span>Uploading files...</span>
                  <span className="text-primary">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2 w-full" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3 cursor-pointer">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2 transition-transform group-hover:scale-110">
                <UploadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">Click or drag files here</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Securely upload images, videos, and PDFs to your personal vault.
              </p>
            </div>
          )}
        </div>

        {/* Summary Stats Grid */}
        {!isLoadingSummary && summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <StatCard icon={<FileArchive />} label="Total Files" value={summary.totalFiles.toString()} />
            <StatCard icon={<ImageIcon />} label="Images" value={summary.imageCount.toString()} />
            <StatCard icon={<Video />} label="Videos" value={summary.videoCount.toString()} />
            <StatCard icon={<FileText />} label="PDFs" value={summary.pdfCount.toString()} />
          </div>
        )}

        {/* Files Grid */}
        <div className="animate-in slide-in-from-bottom-6 fade-in duration-700 delay-100 fill-mode-both">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 tracking-tight">
            Your Library
          </h2>
          
          {isLoadingFiles ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="aspect-square bg-muted/50 rounded-xl animate-pulse border" />
              ))}
            </div>
          ) : files?.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center justify-center space-y-4 border rounded-2xl bg-card shadow-sm">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <File className="h-10 w-10 opacity-50" />
              </div>
              <div>
                <h3 className="text-xl font-semibold tracking-tight mb-1">Your vault is empty</h3>
                <p className="text-sm text-muted-foreground">Upload your first file to get started.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {files?.map(file => (
                <div 
                  key={file.id} 
                  className="group relative rounded-xl border bg-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 flex flex-col"
                >
                  <div className="aspect-square bg-muted/20 relative flex items-center justify-center overflow-hidden border-b">
                    {file.kind === 'image' && (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    )}
                    {file.kind === 'video' && (
                      <div className="w-full h-full bg-black relative flex items-center justify-center">
                        <video src={file.url} className="w-full h-full object-cover opacity-60 transition-opacity duration-300 group-hover:opacity-40" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-12 w-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-lg transform transition-transform group-hover:scale-110">
                            <Play className="h-5 w-5 ml-1 fill-current" />
                          </div>
                        </div>
                      </div>
                    )}
                    {file.kind === 'pdf' && (
                      <div className="flex flex-col items-center justify-center text-primary/80 transition-transform duration-500 group-hover:scale-110">
                        <div className="bg-primary/10 p-4 rounded-full mb-3">
                          <FileText className="h-8 w-8" />
                        </div>
                        <span className="text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary px-2 py-1 rounded-md">PDF Document</span>
                      </div>
                    )}
                    
                    {/* Overlay actions */}
                    <div className="absolute inset-x-0 top-0 p-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-b from-black/60 via-black/20 to-transparent">
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-md bg-white/90 hover:bg-white text-black backdrop-blur-md border-0" onClick={() => copyToClipboard(file.url)} title="Copy URL">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-md backdrop-blur-md border-0" onClick={() => setFileToDelete(file.id)} title="Delete file">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-3.5 bg-card">
                    <p className="text-sm font-medium truncate text-foreground/90" title={file.name}>{file.name}</p>
                    <div className="flex items-center justify-between mt-1.5 text-[11px] font-medium text-muted-foreground">
                      <span className="bg-muted px-1.5 py-0.5 rounded">{formatBytes(file.size)}</span>
                      <span>{formatDate(file.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 mt-16">
        <div className="border-t py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Media Vault. All rights reserved.</p>
          <a
            href="https://mdrdkh.netlify.app/"
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2 font-semibold text-foreground transition-colors hover:text-[#a51d24]"
          >
            <span className="h-2 w-2 rotate-45 rounded-[1px] bg-[#a51d24]" aria-hidden="true" />
            Crafted by Riyad Hossen
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>
      </footer>

      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the file from your vault and any generated links will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="border bg-card rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
      </div>
    </div>
  )
}
