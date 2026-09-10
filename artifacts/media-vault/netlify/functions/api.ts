import { getStore } from "@netlify/blobs";

type FileKind = "image" | "pdf" | "video";

type StoredFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  kind: FileKind;
};

const metadataPrefix = "metadata/";
const filePrefix = "files/";

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getFileKind(mimeType: string): FileKind | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("video/")) return "video";
  return null;
}

function toResponse(file: StoredFile, origin: string) {
  return {
    ...file,
    url: `${origin}/api/files/${file.id}/content`,
  };
}

async function listFiles(store: ReturnType<typeof getStore>): Promise<StoredFile[]> {
  const result = await store.list({ prefix: metadataPrefix });
  const files = await Promise.all(
    result.blobs.map((blob) => store.get(blob.key, { type: "json" }) as Promise<StoredFile | null>),
  );

  return files
    .filter((file): file is StoredFile => file !== null)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export default async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/\.netlify\/functions\/api/, "").replace(/^\/api/, "");
  const store = getStore("media-vault");

  if (request.method === "GET" && route === "/files") {
    const files = await listFiles(store);
    return json(files.map((file) => toResponse(file, url.origin)));
  }

  if (request.method === "GET" && route === "/files/summary") {
    const files = await listFiles(store);
    return json({
      totalFiles: files.length,
      totalBytes: files.reduce((total, file) => total + file.size, 0),
      imageCount: files.filter((file) => file.kind === "image").length,
      pdfCount: files.filter((file) => file.kind === "pdf").length,
      videoCount: files.filter((file) => file.kind === "video").length,
    });
  }

  if (request.method === "POST" && route === "/files") {
    const formData = await request.formData();
    const uploaded = formData.get("file");

    if (!(uploaded instanceof File)) {
      return json({ error: "Choose an image, PDF, or video file." }, 400);
    }

    const kind = getFileKind(uploaded.type);
    if (!kind) {
      return json({ error: "Only images, PDFs, and videos are supported." }, 400);
    }

    const file: StoredFile = {
      id: crypto.randomUUID(),
      name: uploaded.name,
      mimeType: uploaded.type,
      size: uploaded.size,
      createdAt: new Date().toISOString(),
      kind,
    };

    await Promise.all([
      store.set(`${filePrefix}${file.id}`, uploaded),
      store.setJSON(`${metadataPrefix}${file.id}.json`, file),
    ]);

    return json(toResponse(file, url.origin), 201);
  }

  const contentMatch = route.match(/^\/files\/([^/]+)\/content$/);
  if (request.method === "GET" && contentMatch) {
    const id = decodeURIComponent(contentMatch[1]);
    const file = await store.get(`${metadataPrefix}${id}.json`, {
      type: "json",
    }) as StoredFile | null;
    if (!file) return json({ error: "File not found." }, 404);

    const blob = await store.get(`${filePrefix}${id}`, { type: "blob" });
    if (!blob) return json({ error: "File not found." }, 404);

    return new Response(blob, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.size),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const deleteMatch = route.match(/^\/files\/([^/]+)$/);
  if (request.method === "DELETE" && deleteMatch) {
    const id = decodeURIComponent(deleteMatch[1]);
    const metadataKey = `${metadataPrefix}${id}.json`;
    const file = await store.get(metadataKey, { type: "json" });
    if (!file) return json({ error: "File not found." }, 404);

    await Promise.all([
      store.delete(`${filePrefix}${id}`),
      store.delete(metadataKey),
    ]);
    return new Response(null, { status: 204 });
  }

  return json({ error: "Not found." }, 404);
};