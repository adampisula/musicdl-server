function snakeCaseNameParser(key: string): string {
    switch(key) {
        case "isRemix":
            return "is_remix";
        case "durationSeconds":
            return "duration_seconds";
        case "spotifyId":
            return "spotify_id";
        case "youtubeId":
            return "youtube_id";
        case "s3ObjectId":
            return "s3_object_id";
        case "sha1Checksum":
            return "sha1_checksum";
        case "fileExtension":
            return "file_extension";
        case "createdAt":
            return "created_at";
        case "expiresAt":
            return "expires_at";
        case "isSuggestions":
            return "is_suggestions";
        default:
            return key;
    }
}

export function snakeCaseOutputParser(input: object): object {
    const returnObject = {};

    for(const key in input) {
        const newKey = snakeCaseNameParser(key);

        if(Array.isArray(input[key])) {
            returnObject[newKey] = input[key];
        } else if(typeof input[key] == "object") {
            returnObject[newKey] = snakeCaseOutputParser(input[key]);
        } else {
            returnObject[newKey] = input[key];
        }
    }

    return returnObject;
} 