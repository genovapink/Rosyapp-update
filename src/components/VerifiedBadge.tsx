import { BadgeCheck } from "lucide-react";

interface Props {
  variant?: "official" | "premium";
  className?: string;
}

const VerifiedBadge = ({ variant = "premium", className = "w-4 h-4" }: Props) => {
  const color = variant === "official" ? "text-blue-500" : "text-sky-400";
  return <BadgeCheck className={`${color} ${className} fill-current`} aria-label={variant === "official" ? "Official" : "Premium"} />;
};

export default VerifiedBadge;
