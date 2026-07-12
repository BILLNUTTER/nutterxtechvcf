import { Router } from "express";
import { db, settingsTable } from "@workspace/db";

const router = Router();

/**
 * GET /download-vcf
 * Generates and returns the Nutterx Technologies VCF contact file.
 * File is always named NUTTERX.vcf per the product spec.
 */
router.get("/download-vcf", async (req, res) => {
  try {
    const [settings] = await db.select().from(settingsTable).limit(1);

    const companyName = settings?.companyName ?? "Nutterx Technologies";
    const title = settings?.title ?? "Technology Solutions Company";
    const phone = settings?.phone ?? "";
    const email = settings?.email ?? "";
    const website = settings?.website ?? "";
    const address = settings?.address ?? "";

    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${companyName}`,
      `ORG:${companyName}`,
    ];

    if (title) lines.push(`TITLE:${title}`);
    if (phone) lines.push(`TEL;TYPE=WORK,VOICE:${phone}`);
    if (email) lines.push(`EMAIL;TYPE=INTERNET,PREF:${email}`);
    if (website) lines.push(`URL:${website}`);
    if (address) lines.push(`ADR;TYPE=WORK:;;${address};;;;`);

    lines.push("END:VCARD");

    const vcf = lines.join("\r\n");

    res.setHeader("Content-Type", "text/vcard; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="NUTTERX.vcf"');
    res.send(vcf);
  } catch (err) {
    req.log.error({ err }, "VCF generation failed");
    res.status(500).json({
      error: "Internal server error",
      message: "Could not generate VCF file.",
    });
  }
});

export default router;
