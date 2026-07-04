import { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Switch, Button, Tabs, App, Alert, Typography, Modal, Spin } from 'antd';
import { MailOutlined, SendOutlined, SaveOutlined } from '@ant-design/icons';
import PageHeader from '../../components/ui/PageHeader';
import { useConfiguracionSmtp, useActualizarConfiguracionSmtp, useProbarConexionSmtp } from '../../hooks/useConfiguracion';
import { extractApiError, serviceErrorMessage } from '../../utils/errorUtils';

export default function ConfiguracionPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      <PageHeader title="Configuración" />
      <Tabs items={[{ key: 'smtp', label: 'Correo (SMTP)', children: <SmtpTab /> }]} />
    </div>
  );
}

function SmtpTab() {
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  const [probarOpen, setProbarOpen] = useState(false);
  const [correoPrueba, setCorreoPrueba] = useState('');

  const { data, isLoading, isError, error } = useConfiguracionSmtp();
  const actualizarMut = useActualizarConfiguracionSmtp();
  const probarMut = useProbarConexionSmtp();

  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        host: data.host ?? '',
        puerto: data.puerto ?? 587,
        username: data.username ?? '',
        password: '',
        remitente: data.remitente ?? '',
        starttlsEnabled: data.starttlsEnabled,
      });
    }
  }, [data, form]);

  const handleSubmit = async (values: {
    host: string; puerto: number; username: string; password?: string;
    remitente: string; starttlsEnabled: boolean;
  }) => {
    try {
      await actualizarMut.mutateAsync(values);
      notification.success({ message: 'Configuración SMTP guardada' });
      form.setFieldValue('password', '');
    } catch (err: unknown) {
      const { msg } = extractApiError(err);
      notification.error({ message: 'Error al guardar la configuración SMTP', description: msg });
    }
  };

  const handleProbar = async () => {
    try {
      await probarMut.mutateAsync({ correoDestino: correoPrueba });
      notification.success({ message: `Correo de prueba enviado a ${correoPrueba}` });
      setProbarOpen(false);
      setCorreoPrueba('');
    } catch (err: unknown) {
      const { status, msg } = extractApiError(err);
      if (status === 412) {
        notification.error({ message: 'Configuración incompleta', description: msg ?? 'Complete y guarde la configuración SMTP antes de probar.' });
      } else {
        notification.error({ message: 'No se pudo enviar el correo de prueba', description: msg ?? 'Verifique host, puerto y credenciales.' });
      }
    }
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {isError && (
        <Alert
          type="error"
          showIcon
          message="ms-notificaciones no disponible"
          description={serviceErrorMessage(error, 'ms-notificaciones', 8090)}
        />
      )}

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <MailOutlined style={{ color: '#0F6E56', fontSize: 16 }} />
          <Typography.Text strong style={{ fontSize: 14 }}>Servidor de correo saliente</Typography.Text>
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
          Esta cuenta se usa para enviar las notificaciones de citas y pagos a los pacientes.
          Para Gmail: host <code>smtp.gmail.com</code>, puerto <code>587</code>, STARTTLS activado, y como
          password una <em>contraseña de aplicación</em> (no la contraseña normal de la cuenta).
        </Typography.Text>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="host" label="Host SMTP" rules={[{ required: true, message: 'Ingrese el host' }]}>
            <Input placeholder="smtp.gmail.com" />
          </Form.Item>
          <Form.Item name="puerto" label="Puerto" rules={[{ required: true, message: 'Ingrese el puerto' }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={65535} placeholder="587" />
          </Form.Item>
          <Form.Item name="username" label="Usuario / correo de la cuenta" rules={[{ required: true, message: 'Ingrese el usuario' }]}>
            <Input placeholder="clinica.notificaciones@gmail.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            extra={data?.passwordConfigurado ? 'Ya hay un password guardado — déjelo vacío para conservarlo.' : 'Requerido la primera vez.'}
          >
            <Input.Password placeholder={data?.passwordConfigurado ? '••••••••••••' : 'Contraseña de aplicación'} autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="remitente"
            label="Correo remitente"
            rules={[{ required: true, message: 'Ingrese el remitente' }, { type: 'email', message: 'Correo inválido' }]}
          >
            <Input placeholder="clinica.notificaciones@gmail.com" />
          </Form.Item>
          <Form.Item name="starttlsEnabled" label="STARTTLS" valuePropName="checked">
            <Switch />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button icon={<SendOutlined />} onClick={() => setProbarOpen(true)} disabled={!data?.passwordConfigurado}>
              Probar conexión
            </Button>
            <Button type="primary" icon={<SaveOutlined />} loading={actualizarMut.isPending} onClick={() => form.submit()}>
              Guardar
            </Button>
          </div>
        </Form>
      </div>

      <Modal
        title="Enviar correo de prueba"
        open={probarOpen}
        onCancel={() => setProbarOpen(false)}
        onOk={handleProbar}
        okText="Enviar"
        confirmLoading={probarMut.isPending}
      >
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
          Se usará la configuración guardada (no los cambios sin guardar del formulario).
        </Typography.Text>
        <Input
          placeholder="destinatario@correo.com"
          value={correoPrueba}
          onChange={(e) => setCorreoPrueba(e.target.value)}
        />
      </Modal>
    </div>
  );
}
