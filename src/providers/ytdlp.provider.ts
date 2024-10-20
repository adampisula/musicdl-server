import path from 'path'
import { v4 as uuid } from "uuid";
import { TEMP_PATH } from '@/config'
import { Service } from 'typedi'
import { spawn } from "child_process";

@Service()
export class YtDlpProvider {
    private AUDIO_FORMAT = "mp3";
    private YTDLP_ARGS = [
        "-x",
        "--audio-format",
        this.AUDIO_FORMAT,
        "--audio-quality",
        "0",  // best
    ];

    async download(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const fileName = `${uuid()}.${this.AUDIO_FORMAT}`;
            const outFilePath = path.join(TEMP_PATH, fileName);

            const ytdlpProcess = spawn("yt-dlp", [
                ...this.YTDLP_ARGS,
                "-o",
                outFilePath,
                url,
            ]);
            ytdlpProcess
                .on("exit", (code, _signal) => {
                    if (code === 0) {
                        resolve(outFilePath);
                    } else {
                        reject(new Error(`ytdlp exited with code ${code}`));
                    }
                })
                .on("error", (err) => {
                    reject(err);
                })
        });
    }
}