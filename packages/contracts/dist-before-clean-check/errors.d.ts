export declare const UNSUPPORTED_PROTOCOL: {
    readonly code: "UNSUPPORTED_PROTOCOL";
    readonly message: "This client does not support the room protocol version.";
    readonly supportedVersion: 2;
};
export type UnsupportedProtocolError = typeof UNSUPPORTED_PROTOCOL;
