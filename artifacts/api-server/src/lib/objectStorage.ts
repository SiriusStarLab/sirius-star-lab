import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  S3ObjectRef,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl.js";

const REGION = process.env.STORAGE_REGION ?? "eu-west-1";
const BUCKET = process.env.STORAGE_BUCKET ?? "sirius-storage";

export const s3 = new S3Client({
  region: REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  } : undefined,
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  private bucket = BUCKET;

  async searchPublicObject(filePath: string): Promise<S3ObjectRef | null> {
    const key = `public/${filePath.replace(/^\//, "")}`;
    try {
      await s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { bucket: this.bucket, key };
    } catch {
      return null;
    }
  }

  async downloadObject(ref: S3ObjectRef, cacheTtlSec: number = 3600): Promise<Response> {
    const aclPolicy = await getObjectAclPolicy(s3, ref).catch(() => null);
    const isPublic = aclPolicy?.visibility === "public";

    const cmd = new GetObjectCommand({ Bucket: ref.bucket, Key: ref.key });
    const result = await s3.send(cmd);

    const headers: Record<string, string> = {
      "Content-Type": result.ContentType ?? "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (result.ContentLength) {
      headers["Content-Length"] = String(result.ContentLength);
    }

    return new Response(result.Body as ReadableStream, { headers });
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    const key = `private/uploads/${objectId}`;
    const cmd = new PutObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(s3, cmd, { expiresIn: 900 });
  }

  async getObjectEntityDownloadURL(objectPath: string, ttlSec: number = 3600): Promise<string> {
    const ref = this.resolveObjectPath(objectPath);
    const cmd = new GetObjectCommand({ Bucket: ref.bucket, Key: ref.key });
    return getSignedUrl(s3, cmd, { expiresIn: ttlSec });
  }

  async getObjectEntityFile(objectPath: string): Promise<S3ObjectRef> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const ref = this.resolveObjectPath(objectPath);
    try {
      await s3.send(new HeadObjectCommand({ Bucket: ref.bucket, Key: ref.key }));
      return ref;
    } catch {
      throw new ObjectNotFoundError();
    }
  }

  normalizeObjectEntityPath(rawPath: string): string {
    const s3UrlPattern = new RegExp(
      `https://${this.bucket}\\.s3\\.[\\w-]+\\.amazonaws\\.com/([^?]+)`
    );
    const match = rawPath.match(s3UrlPattern);
    if (!match) return rawPath;

    const key = match[1];
    const privatePrefix = "private/";
    if (key.startsWith(privatePrefix)) {
      return `/objects/${key.slice(privatePrefix.length)}`;
    }
    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) return normalizedPath;

    const ref = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(s3, ref, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: S3ObjectRef;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      s3,
      userId,
      ref: objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  private resolveObjectPath(objectPath: string): S3ObjectRef {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const id = objectPath.slice("/objects/".length);
    return { bucket: this.bucket, key: `private/${id}` };
  }
}
