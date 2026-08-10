import Image from "next/image";

const partners = [
  { name: "컴퍼니 연결", src: "/images/partner-company-connection.png", width: 1000, height: 1000 },
  { name: "나인진엔터테인먼트", src: "/images/partner-ninejin.png", width: 300, height: 128 },
  { name: "NAM THEATER", src: "/images/partner-nam-theater.png", width: 522, height: 290 },
] as const;

function PartnerGroup({ duplicate = false }: { readonly duplicate?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-4 pr-4 sm:gap-6 sm:pr-6" aria-hidden={duplicate || undefined}>
      {partners.map((partner) => (
        <div key={partner.name} className="grid h-40 w-40 shrink-0 place-items-center rounded-card border border-border bg-white p-3 shadow-[var(--shadow-1)] sm:h-44 sm:w-44">
          <Image
            src={partner.src}
            alt={duplicate ? "" : partner.name}
            width={partner.width}
            height={partner.height}
            className="h-full w-full object-contain"
          />
        </div>
      ))}
    </div>
  );
}

export function PartnerMarquee() {
  return (
    <section aria-labelledby="partners-title" className="overflow-hidden border-y border-border bg-surface py-16 lg:py-20">
      <div className="mx-auto max-w-[1280px] px-5 text-center sm:px-8 lg:px-10">
        <p className="text-sm font-bold text-brand">PARTNERS</p>
        <h2 id="partners-title" className="mt-3 text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.03em]">함께하는 공연사</h2>
        <p className="mt-3 text-base text-muted-strong">공연과 오디션의 새로운 흐름을 함께 만들어가고 있습니다.</p>
      </div>
      <div className="partner-marquee-mask mt-10 overflow-hidden">
        <div className="partner-marquee-track flex w-max">
          <PartnerGroup />
          <PartnerGroup duplicate />
        </div>
      </div>
    </section>
  );
}
