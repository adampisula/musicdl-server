import { TrackMetadata } from "@/interfaces/track.interface";
import NodeID3 from "node-id3";

export async function setID3Tags(filePath: string, metadata: TrackMetadata): Promise<void> {
    const tags = {
        artist: metadata.artists.join(", "),
        title: metadata.title,
    };

    await new Promise((resolve, reject) => {
        NodeID3.write(tags, filePath, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(null);
            }
        });
    });
}