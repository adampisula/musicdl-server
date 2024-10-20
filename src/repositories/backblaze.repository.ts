import { BACKBLAZE_APPLICATION_KEY, BACKBLAZE_APPLICATION_KEY_ID, BACKBLAZE_BUCKET_ID } from '@/config'
import { FileRepository } from '@interfaces/fileRepository.interface';
import B2 from 'backblaze-b2';
import { Service } from 'typedi'
import { readFile } from "fs/promises";

@Service()
export class BackblazeRepository implements FileRepository {
    private B2_COMMON_ARGS = {
        axios: {
            timeout: 60000,
        },
    };

    private b2: B2;
    private b2BaseDownloadUrl: string;

    constructor() {
        this.b2 = new B2({
            applicationKeyId: BACKBLAZE_APPLICATION_KEY_ID,
            applicationKey: BACKBLAZE_APPLICATION_KEY,
        });
    }

    private async authorize(): Promise<void> {
        const authResponse = await this.b2.authorize({
            ...this.B2_COMMON_ARGS,
        });
        this.b2BaseDownloadUrl = authResponse.data.downloadUrl;
    }

    public async upload(
        tempPath: string,
        fileName: string,
        sha1Checksum: string
    ): Promise<string> {
        await this.authorize();

        const { uploadUrl, authorizationToken } = (await this.b2.getUploadUrl({
            ...this.B2_COMMON_ARGS,
            bucketId: BACKBLAZE_BUCKET_ID,
        })).data;

        const fileBuffer = await readFile(tempPath);
        const uploadResult = await this.b2.uploadFile({
            ...this.B2_COMMON_ARGS,
            uploadUrl: uploadUrl,
            uploadAuthToken: authorizationToken,
            fileName: fileName,
            mime: "audio/mpeg",
            data: fileBuffer,
            hash: sha1Checksum,
        });

        return uploadResult.data.fileId;
    }

    public async getDownloadUrl(objectId: string): Promise<string> {
        await this.authorize();

        const fullDownloadUrl = [
            this.b2BaseDownloadUrl,
            "b2api",
            "v1",
            `b2_download_file_by_id?fileId=${objectId}`,
        ].join("/");

        return fullDownloadUrl;
    }
}