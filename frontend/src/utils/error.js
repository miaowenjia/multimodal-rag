import axios from "axios";
const stringifyUnknown = (input) => {
    if (typeof input === "string") {
        return input;
    }
    if (input && typeof input === "object") {
        return JSON.stringify(input);
    }
    return "请求失败，请稍后重试";
};
export const extractErrorMessage = (err) => {
    if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === "string" && detail.length > 0) {
            return detail;
        }
        if (Array.isArray(detail) || (detail && typeof detail === "object")) {
            return stringifyUnknown(detail);
        }
        if (err.message) {
            return err.message;
        }
    }
    if (err instanceof Error && err.message) {
        return err.message;
    }
    return "请求失败，请稍后重试";
};
