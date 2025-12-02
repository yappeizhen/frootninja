import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function CameraFeed({ status, videoRef }) {
    return (_jsxs("div", { className: "panel", children: [_jsxs("div", { className: "panel__header", children: [_jsx("h3", { children: "Hand Tracking" }), _jsx("span", { className: `badge badge--${status}`, children: status })] }), _jsx("div", { className: "panel__body", children: _jsx("video", { ref: videoRef, autoPlay: true, muted: true, playsInline: true, className: "camera-feed" }) })] }));
}
