import { readFile } from "fs/promises";

export async function fileSize(filePath: string): Promise<number> {
    return (await readFile(filePath)).length;
}