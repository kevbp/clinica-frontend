import { Result } from 'antd';

export default function ComingSoonPage({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Result status="info" title={title} subTitle="Módulo en construcción" />
    </div>
  );
}
