import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Router, type IRouter, type Request } from "express";
import multer from "multer";
import {
  DeleteFileParams,
  GetFileContentParams,
  GetFilesSummaryResponse,
  ListFilesResponse,
  UploadFileResponse,
} from "@workspace/api-zod";

type FileKind = "image" | "pdf" | "video";

type StoredFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  kind: FileKind;
};

const router: IRouter = Router();
const dataDirectory = path.resolve(process.cwd(), "data", "media-vault");
const fileDirectory = path.join(dataDirectory, "files");
const metadataDirectory = path.join(dataDirectory, "metadata");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    callback(null, getFileKind(file.mimetype) !== null);
  },
});

function getFileKind(mimeType: string): FileKind | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("video/")) return "video";
  return null;
}

function getPublicOrigin(request: Request): string {
  const forwardedProtocol = request.get("x-forwarded-proto")?.split(",")[0];
  const forwardedHost = request.get("x-forwarded-host")?.split(",")[0];
  const protocol = forwardedProtocol ?? request.protocol;
  const host = forwardedHost ?? request.get("host");
  return `${protocol}://${host}`;
}

function toResponse(file: StoredFile, request: Request) {
  return {
    ...file,
    url: `${getPublicOrigin(request)}/api/files/${file.id}/content`,
  };
}

async function ensureDirectories(): Promise<void> {
  await Promise.all([
    mkdir(fileDirectory, { recursive: true }),
    mkdir(metadataDirectory, { recursive: true }),
  ]);
}

async function readStoredFile(id: string): Promise<StoredFile | null> {
  try {
    const raw = await readFile(path.join(metadataDirectory, `${id}.json`), "utf8");
    const parsed = JSON.parse(raw) as Omit<StoredFile, "createdAt"> & {
      createdAt: string;
    };
    return { ...parsed, createdAt: new Date(parsed.createdAt) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function listStoredFiles(): Promise<StoredFile[]> {
  await ensureDirectories();
  const entries = await readdir(metadataDirectory);
  const files = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".json"))
      .map((entry) => readStoredFile(entry.slice(0, -5))),
  );

  return files
    .filter((file): file is StoredFile => file !== null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

router.get("/files", async (request, response): Promise<void> => {
  const files = await listStoredFiles();
  response.json(ListFilesResponse.parse(files.map((file) => toResponse(file, request))));
});

router.get("/files/summary", async (_request, response): Promise<void> => {
  const files = await listStoredFiles();
  response.json(
    GetFilesSummaryResponse.parse({
      totalFiles: files.length,
      totalBytes: files.reduce((total, file) => total + file.size, 0),
      imageCount: files.filter((file) => file.kind === "image").length,
      pdfCount: files.filter((file) => file.kind === "pdf").length,
      videoCount: files.filter((file) => file.kind === "video").length,
    }),
  );
});

router.post(
  "/files",
  upload.single("file"),
  async (request, response): Promise<void> => {
    if (!request.file) {
      response.status(400).json({ error: "Choose an image, PDF, or video file." });
      return;
    }

    const kind = getFileKind(request.file.mimetype);
    if (!kind) {
      response.status(400).json({ error: "Only images, PDFs, and videos are supported." });
      return;
    }

    await ensureDirectories();
    const file: StoredFile = {
      id: randomUUID(),
      name: request.file.originalname,
      mimeType: request.file.mimetype,
      size: request.file.size,
      createdAt: new Date(),
      kind,
    };

    await Promise.all([
      writeFile(path.join(fileDirectory, file.id), request.file.buffer),
      writeFile(
        path.join(metadataDirectory, `${file.id}.json`),
        JSON.stringify(file),
        "utf8",
      ),
    ]);

    request.log.info(
      { fileId: file.id, mimeType: file.mimeType, size: file.size },
      "Stored uploaded file",
    );
    response.status(201).json(UploadFileResponse.parse(toResponse(file, request)));
  },
);

router.get("/files/:id/content", async (request, response): Promise<void> => {
  const params = GetFileContentParams.safeParse(request.params);
  if (!params.success) {
    response.status(400).json({ error: params.error.message });
    return;
  }

  const file = await readStoredFile(params.data.id);
  if (!file) {
    response.status(404).json({ error: "File not found." });
    return;
  }

  response.setHeader("Content-Type", file.mimeType);
  response.setHeader("Content-Length", String(file.size));
  response.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  response.sendFile(path.join(fileDirectory, file.id));
});

router.delete("/files/:id", async (request, response): Promise<void> => {
  const params = DeleteFileParams.safeParse(request.params);
  if (!params.success) {
    response.status(400).json({ error: params.error.message });
    return;
  }

  const file = await readStoredFile(params.data.id);
  if (!file) {
    response.status(404).json({ error: "File not found." });
    return;
  }

  await Promise.all([
    rm(path.join(fileDirectory, file.id), { force: true }),
    rm(path.join(metadataDirectory, `${file.id}.json`), { force: true }),
  ]);

  request.log.info({ fileId: file.id }, "Deleted uploaded file");
  response.sendStatus(204);
});

export default router;