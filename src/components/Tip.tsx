interface Props {
  text: string;
  children: React.ReactNode;
  as?: "span" | "th" | "td";
}

export function Tip({ text, children, as: Tag = "span" }: Props) {
  return (
    <Tag className="tip-host">
      {children}
      <span className="tip-bubble">{text}</span>
    </Tag>
  );
}
