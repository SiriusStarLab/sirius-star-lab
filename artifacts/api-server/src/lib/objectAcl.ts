import { S3Client, HeadObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";

const ACL_METADATA_KEY = "aclpolicy";

export enum ObjectAccessGroupType {}

export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
}

export type S3ObjectRef = { bucket: string; key: string };

function isPermissionAllowed(
  requested: ObjectPermission,
  granted: ObjectPermission,
): boolean {
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }
  return granted === ObjectPermission.WRITE;
}

export async function setObjectAclPolicy(
  s3: S3Client,
  ref: S3ObjectRef,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  const head = await s3.send(new HeadObjectCommand({ Bucket: ref.bucket, Key: ref.key }));
  const existingMeta = head.Metadata ?? {};
  await s3.send(new CopyObjectCommand({
    Bucket: ref.bucket,
    Key: ref.key,
    CopySource: `${ref.bucket}/${ref.key}`,
    MetadataDirective: "REPLACE",
    Metadata: {
      ...existingMeta,
      [ACL_METADATA_KEY]: JSON.stringify(aclPolicy),
    },
    ContentType: head.ContentType,
  }));
}

export async function getObjectAclPolicy(
  s3: S3Client,
  ref: S3ObjectRef,
): Promise<ObjectAclPolicy | null> {
  const head = await s3.send(new HeadObjectCommand({ Bucket: ref.bucket, Key: ref.key }));
  const raw = head.Metadata?.[ACL_METADATA_KEY];
  if (!raw) return null;
  return JSON.parse(raw) as ObjectAclPolicy;
}

export async function canAccessObject({
  s3,
  userId,
  ref,
  requestedPermission,
}: {
  s3: S3Client;
  userId?: string;
  ref: S3ObjectRef;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  const aclPolicy = await getObjectAclPolicy(s3, ref);
  if (!aclPolicy) return false;

  if (aclPolicy.visibility === "public" && requestedPermission === ObjectPermission.READ) {
    return true;
  }

  if (!userId) return false;
  if (aclPolicy.owner === userId) return true;

  return false;
}
