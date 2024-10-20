export interface FileRepository {
    upload(
        tempPath: string,
        fileName: string,
        sha1Checksum: string
    ): Promise<string>;  // returns object ID
    getDownloadUrl(objectId: string): Promise<string>;  // returns download URL
}