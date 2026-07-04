import { useState } from 'react';
import { Input, Spin, Typography, Button } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { SearchOutlined } from '@ant-design/icons';
import { useDebouncedSearch } from '../../hooks/useDebouncedSearch';
import * as pacientesApi from '../../api/pacientes';
import type { PacienteResponseDTO } from '../../types/pacientes';

export default function BuscadorPaciente({
  pacienteSeleccionado,
  onSeleccionar,
  placeholder = 'Buscar paciente por nombre, apellido o documento',
}: {
  pacienteSeleccionado: PacienteResponseDTO | null;
  onSeleccionar: (p: PacienteResponseDTO | null) => void;
  placeholder?: string;
}) {
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebouncedSearch(searchInput, 400);

  const { data: resultados = [], isFetching } = useQuery({
    queryKey: ['pacientes', 'buscar', searchQuery],
    queryFn: () => pacientesApi.buscar(searchQuery),
    enabled: searchQuery.trim().length >= 2 && !pacienteSeleccionado,
  });

  if (pacienteSeleccionado) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#F0FAF6', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px',
      }}>
        <div>
          <Typography.Text strong style={{ fontSize: 13, display: 'block' }}>
            {pacienteSeleccionado.nombres} {pacienteSeleccionado.apellidos}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            Doc. {pacienteSeleccionado.documentoIdentidad}
          </Typography.Text>
        </div>
        <Button size="small" onClick={() => { onSeleccionar(null); setSearchInput(''); }}>Cambiar paciente</Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--text-hint)' }} />}
        placeholder={placeholder}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        allowClear
      />
      {searchQuery.trim().length >= 2 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
          {isFetching ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Spin size="small" /></div>
          ) : resultados.length === 0 ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Sin resultados.</Typography.Text>
          ) : (
            resultados.map(p => (
              <div
                key={p.id}
                role="button"
                onClick={() => onSeleccionar(p)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid var(--border)', background: '#fff',
                }}
              >
                <div>
                  <Typography.Text style={{ fontSize: 13, fontWeight: 500, display: 'block' }}>
                    {p.nombres} {p.apellidos}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>Doc. {p.documentoIdentidad}</Typography.Text>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
