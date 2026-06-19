"use client";

import { Fragment } from "react";
import type { Service } from "@/lib/types";
import { ServiceCard } from "./ServiceCard";
import { MiniSelectedCard } from "./MiniSelectedCard";
import { ServiceDetail } from "./ServiceDetail";

type Props = {
  services: Service[];
  expandedId: string | null;
  onToggle: (id: string) => void;
};

export function ServiceGrid({ services, expandedId, onToggle }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "var(--sb-grid)",
        gap: 14,
        marginBottom: 14,
      }}
    >
      {services.map((svc) => {
        const isExpanded = svc.id === expandedId;
        const handle = () => onToggle(svc.id);
        if (isExpanded) {
          return (
            <Fragment key={svc.id}>
              <MiniSelectedCard service={svc} onClick={handle} />
              <ServiceDetail service={svc} onClose={handle} />
            </Fragment>
          );
        }
        return <ServiceCard key={svc.id} service={svc} onClick={handle} />;
      })}
    </div>
  );
}
