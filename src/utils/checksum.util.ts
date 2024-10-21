import { readFile } from "fs/promises";
import { createHash } from "crypto";

export async function sha1(filePath: string): Promise<string> {
    const data = await readFile(filePath);
    const checksum = createHash("sha1").update(data).digest("hex");

    return checksum;
}