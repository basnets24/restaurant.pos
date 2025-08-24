

type Props = {
    ipadSrc: string;
    monitorSrc: string;
    hoverIntensity?: number;
};

export default function DeviceShowcaseCard({ ipadSrc, monitorSrc, hoverIntensity = 6 }: Props) {
    return (
        <div
            className="relative w-full max-w-xl aspect-[4/3] float-slow"
            style={{ perspective: "1000px" }}
        >
            <img
                src={monitorSrc}
                alt="Monitor"
                className="absolute inset-0 w-full h-full object-contain drop-shadow-xl"
                style={{ transform: `rotateX(2deg) rotateY(-2deg)` }}
            />
            <img
                src={ipadSrc}
                alt="iPad"
                className="absolute -bottom-4 -right-6 w-1/2 md:w-2/5 object-contain drop-shadow-lg"
                style={{ transform: `rotateX(3deg) rotateY(${hoverIntensity}deg)` }}
            />
        </div>
    );
}
