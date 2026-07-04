interface PageHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</h1>
      {actions && <div>{actions}</div>}
    </div>
  );
}
