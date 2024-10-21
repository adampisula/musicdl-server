import joi from "joi";

export const getDownloadUrlSchema = joi.object({
    url: joi.string().uri().required(),
});

export const getMetadataSchema = joi.object({
    url: joi.string().uri().required(),
});

export const getAlternativesSchema = joi.object({
    url: joi.string().uri().required(),
    prefer_extended: joi.valid("true", "false"),
});

export const fetchSchema = joi.object({
    source: joi.object({
        spotify_url: joi.string().uri(),
        youtube_url: joi.string().uri().required(),
    }),
    metadata: joi.object({
        artists: joi.array().items(joi.string()).required(),
        title: joi.string().not().empty().required(),
        is_remix: joi.boolean().required(),
        duration_seconds: joi.number().positive().required(),
    }),
});