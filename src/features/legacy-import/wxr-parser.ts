import { createImportCandidate } from "@/features/data-readiness";
import { parseLegacyMileage, parseLegacyPower, parseLegacyPrice, parseLegacyRegistrationDate, sanitizeLegacyHtml } from "./normalization";
import type { LegacyMedia, LegacyVehicle } from "./types";

const content = (xml: string, tag: string): string | null => {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim() : null;
};

const postMeta = (item: string): Readonly<Record<string, string>> => {
  const result: Record<string, string> = {};
  for (const match of item.matchAll(/<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/gi)) {
    const key = content(match[1], "wp:meta_key");
    const value = content(match[1], "wp:meta_value");
    if ((key?.startsWith("veh-") || key === "_thumbnail_id" || key === "_wp_attached_file" || key === "_wp_attachment_metadata") && value !== null) result[key] = value;
  }
  return result;
};

type AttachmentReference = Readonly<{ legacyUrl: string | null; relativePath: string | null; originalRelativePath: string | null }>;

const originalRelativePath = (attachedFile: string | null, metadata: string | null): string | null => {
  if (!attachedFile || !metadata) return null;
  const originalName = metadata.match(/s:14:"original_image";s:\d+:"([^"]+)";/)?.[1] ?? null;
  if (!originalName) return null;
  const slash = attachedFile.lastIndexOf("/");
  return slash >= 0 ? `${attachedFile.slice(0, slash + 1)}${originalName}` : originalName;
};

const galleryAttachmentIds = (value: string): readonly string[] => {
  const serializedStrings = [...value.matchAll(/i:\d+;s:\d+:"(\d+)";/g)].map((match) => match[1]);
  if (serializedStrings.length > 0) return serializedStrings;
  const serializedIntegers = [...value.matchAll(/i:\d+;i:(\d+);/g)].map((match) => match[1]);
  if (serializedIntegers.length > 0) return serializedIntegers;
  if (/^\s*\[/.test(value)) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string | number => typeof item === "string" || typeof item === "number").map(String).filter((item) => /^\d+$/.test(item));
    } catch {
      return [];
    }
  }
  return value.match(/\d+/g) ?? [];
};

const mediaFrom = (fields: Readonly<Record<string, string>>, attachments: ReadonlyMap<string, AttachmentReference>): readonly LegacyMedia[] => {
  const ids = galleryAttachmentIds(fields["veh-gallerie_photos"] ?? "");
  const thumbnail = fields["veh-thumbnail"] ?? fields["_thumbnail_id"] ?? null;
  const ordered = thumbnail ? [thumbnail, ...ids.filter((id) => id !== thumbnail)] : ids;
  return ordered.map((attachmentId, position) => ({ attachmentId, ...(attachments.get(attachmentId) ?? { legacyUrl: null, relativePath: null, originalRelativePath: null }), position, role: position === 0 ? "COVER" : "GALLERY", status: "PENDING" }));
};

export function parseWordPressWxr(xml: string, garageId: string): readonly LegacyVehicle[] {
  const attachments = new Map<string, AttachmentReference>();
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const item = match[1];
    if (content(item, "wp:post_type") !== "attachment") continue;
    const id = content(item, "wp:post_id");
    if (!id) continue;
    const fields = postMeta(item);
    const relativePath = fields["_wp_attached_file"] ?? null;
    attachments.set(id, {
      legacyUrl: content(item, "wp:attachment_url") ?? content(item, "guid"),
      relativePath,
      originalRelativePath: originalRelativePath(relativePath, fields["_wp_attachment_metadata"] ?? null),
    });
  }
  const vehicles: LegacyVehicle[] = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const item = match[1];
    const postType = content(item, "wp:post_type");
    if (!postType || !/vehicul/i.test(postType)) continue;
    const externalId = content(item, "wp:post_id");
    const title = content(item, "title") ?? "";
    if (!externalId || !title) continue;
    const fields = postMeta(item);
    const wordpressStatus = content(item, "wp:status") ?? "unknown";
    const html = sanitizeLegacyHtml(content(item, "content:encoded") ?? "");
    const sold = /^(?:1|true|oui|vendu)$/i.test(fields["veh-vendu"]?.trim() ?? "");
    const reserved = /réserv/i.test(fields["veh-vendu"] ?? "") || /réserv/i.test(title);
    const decision = wordpressStatus === "trash" ? "IGNORE" : wordpressStatus === "publish" ? "IMPORT" : "REVIEW";
    const vehicle: LegacyVehicle = {
      externalId, slug: content(item, "wp:post_name"), originalUrl: content(item, "link"), title,
      rawHtml: html.rawHtml, plainText: html.plainText, wordpressStatus,
      category: content(item, "category"), createdAt: content(item, "wp:post_date_gmt"), updatedAt: content(item, "wp:post_modified_gmt"), fields,
      price: parseLegacyPrice(fields["veh-prix"]), mileageKm: parseLegacyMileage(fields["veh-kilometrage"]),
      firstRegistration: parseLegacyRegistrationDate(fields["veh-premiere-mec"]), power: parseLegacyPower(fields["veh-puissance"]),
      lifecycle: sold ? "SOLD" : reserved ? "RESERVED" : wordpressStatus === "publish" ? "AVAILABLE" : "UNKNOWN",
      media: mediaFrom(fields, attachments), decision,
    };
    createImportCandidate({ garageId, source: "WORDPRESS", externalId }, vehicle);
    vehicles.push(vehicle);
  }
  return vehicles;
}
