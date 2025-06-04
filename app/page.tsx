import dynamic from "next/dynamic";

const HalMicVisualizer = dynamic(() => import("./components/HalMicVisualizer"), { ssr: false });

export default function Page() {
    return (
        <HalMicVisualizer />
    );
}
